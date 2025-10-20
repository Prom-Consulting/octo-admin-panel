import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import axios, { AxiosError } from "axios";
import { Op } from "sequelize";
import Assignment from "../models/Assignment";
import { authMiddleware } from "../middleware/auth";
import { DateTime } from "luxon";
import { envConfig } from "../../config/envConfig.ts";
import idGeneration from "../utils /idGeneration.ts";
import Organization from "../models/Organization.ts";
import jwt from "jsonwebtoken";

const AssignmentsBookingServiceRoute = Router();

// ============ ТИПЫ ============

interface ServicePrice {
  price: number;
  duration: number;
}

interface ServiceWithPrice {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface ClientInfo {
  id: number;
  first_name: string;
  last_name?: string | null;
  phone: string;
}

interface EmployeeInfo {
  id: number;
  firstname: string;
  lastname?: string | null;
  role: string;
}

// ============ ВАЛИДАЦИЯ СХЕМА ============

const CreateAssignmentSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  timezone: z.string().default("UTC"),
  client: z.object({
    id: z.number().int().positive(),
    first_name: z.string().min(1),
    last_name: z.string().nullable().optional(),
    phone: z.string().min(1),
  }),
  employee: z.object({
    id: z.number().int().positive(),
    firstname: z.string().min(1),
    lastname: z.string().nullable().optional(),
    role: z.enum(["employee", "manager"]),
  }),
  service: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    price: z.number().positive(),
    duration: z.number().positive(),
  }),
  additionalServices: z
    .array(
      z.object({
        id: z.number().int().positive(),
        name: z.string(),
        price: z.number().positive(),
        duration: z.number().positive(),
      })
    )
    .default([]),
  assignmentDate: z.string(), // ISO date format: "2025-10-20"
  startTime: z.string(), // "14:30"
  notes: z.string().nullable().optional(),
  source: z.enum(["web", "mobile", "admin", "booking"]),
  discount: z.number().min(0).max(100).default(0),
  managerId: z.number().int().positive().nullable().optional(),
});

type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

/**
 * Нормализация цен (преобразование строк в числа)
 */
const transformPrices = (price: any): number => {
  if (typeof price === "number") return price;
  if (typeof price === "string") return parseFloat(price);
  return 0;
};

/**
 * Расчет итоговой цены с учетом скидки
 */
const calculateFinalPrice = (
  service: ServiceWithPrice,
  additionalServices: ServiceWithPrice[],
  discount: number
): { totalPrice: number; finalPrice: number } => {
  const totalPrice =
    service.price + additionalServices.reduce((sum, s) => sum + s.price, 0);

  const discountAmount = (totalPrice * discount) / 100;
  const finalPrice = Math.max(0, totalPrice - discountAmount);

  return { totalPrice, finalPrice };
};

/**
 * Расчет общей длительности
 */
const calculateTotalDuration = (
  service: ServiceWithPrice,
  additionalServices: ServiceWithPrice[]
): number => {
  return (
    service.duration + additionalServices.reduce((sum, s) => sum + s.duration, 0)
  );
};

/**
 * Проверка пересечений по времени
 */
const checkTimeOverlap = async (
  employeeId: number,
  branchId: number,
  assignmentDate: Date,
  startTime: string,
  endTime: string
): Promise<boolean> => {
  const overlap = await Assignment.findOne({
    where: {
      employee_id: employeeId,
      branch_id: branchId,
      assignment_date: assignmentDate,
      status: { [Op.notIn]: ["canceled", "completed"] },
      [Op.and]: [
        { start_time: { [Op.lt]: endTime } },
        { end_time: { [Op.gt]: startTime } },
      ],
    },
  });

  return !!overlap;
};

/**
 * Дублирование записи на клиентскую сторону
 */
const syncToClientDatabase = async (
  assignment: Assignment,
  clientApiUrl: string,
  organizationName: string,
  branchId: number
): Promise<void> => {
  try {
    const token = jwt.sign(
      {
        organizationName: organizationName,
        branchId: branchId,
      },
      envConfig.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    await axios.post(
      `${clientApiUrl}/calendar`,
      {
        clientAssignment: assignment.toJSON(),
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
          admin_panel: true,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`✅ Assignment ${assignment.id} synced to client database`);
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error("Failed to sync to client database:", {
        assignmentId: assignment.id,
        status: error.response?.status,
        message: error.message,
      });
      throw new Error("Data duplication to client database failed");
    }
    throw error;
  }
};

// ============ ENDPOINT ============

/**
 * POST /assignments
 * Создание новой записи (assignment) с дублированием на клиентскую БД
 */
AssignmentsBookingServiceRoute.post(
  "/assignments",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Валидация входных данных
      const validatedData = CreateAssignmentSchema.parse(req.body);

      const {
        organizationId,
        branchId,
        timezone,
        client,
        employee,
        service,
        additionalServices,
        assignmentDate,
        startTime,
        notes,
        source,
        discount,
        managerId,
      } = validatedData;

      const organization = await Organization.findOne({
        where: { id: organizationId },
      });

      if (!organization) {
        return res.status(403).json({
          success: false,
          message: "Organization not found.",
        });
      }

      // Нормализация цен
      const normalizedService: ServiceWithPrice = {
        ...service,
        price: transformPrices(service.price),
        duration: transformPrices(service.duration),
      };

      const normalizedAdditional = additionalServices.map((s) => ({
        ...s,
        price: transformPrices(s.price),
        duration: transformPrices(s.duration),
      }));

      // Расчет финальной цены и длительности
      const { finalPrice } = calculateFinalPrice(
        normalizedService,
        normalizedAdditional,
        discount
      );

      const totalDuration = calculateTotalDuration(
        normalizedService,
        normalizedAdditional
      );

      // Формирование дат с учетом timezone
      const startDateTime = DateTime.fromISO(`${assignmentDate}T${startTime}`, {
        zone: timezone,
      });

      if (!startDateTime.isValid) {
        return res.status(400).json({
          error: "Invalid date or time format",
          details: startDateTime.invalidReason,
        });
      }

      const endDateTime = startDateTime.plus({ minutes: totalDuration });

      // Конвертация в UTC для хранения в БД
      const assignmentDateUTC = startDateTime.startOf("day").toUTC().toJSDate();
      const startTimeUTC = startDateTime.toUTC().toFormat("HH:mm");
      const endTimeUTC = endDateTime.toUTC().toFormat("HH:mm");

      // Проверка пересечений по времени
      const hasOverlap = await checkTimeOverlap(
        employee.id,
        branchId,
        assignmentDateUTC,
        startTimeUTC,
        endTimeUTC
      );

      if (hasOverlap) {
        return res.status(409).json({
          error: "Time slot conflict",
          message: "The employee is already booked at this time",
          details: {
            requestedStart: startTimeUTC,
            requestedEnd: endTimeUTC,
          },
        });
      }

      // Создание записи в общей БД
      const newAssignment = await Assignment.create({
        id: idGeneration(`ORG${organizationId}`, 6),
        organization_id: organizationId,
        branch_id: branchId,
        assignment_date: assignmentDateUTC,
        start_time: startTimeUTC,
        end_time: endTimeUTC,
        client_id: client.id,
        client_snapshot: {
          first_name: client.first_name,
          last_name: client.last_name || null,
          phone: client.phone,
        },
        employee_id: employee.id,
        employee_snapshot: {
          first_name: employee.firstname,
          last_name: employee.lastname || null,
          role: employee.role,
        },
        service_id: normalizedService.id,
        service_snapshot: {
          name: normalizedService.name,
          price: normalizedService.price,
          duration: normalizedService.duration,
        },
        additional_services:
          normalizedAdditional.length > 0 ? normalizedAdditional : null,
        manager_id: managerId || null,
        manager_snapshot: null,
        status: "new",
        notes: notes || null,
        source,
        discount: discount || 0,
        final_price: finalPrice,
        total_duration: totalDuration,
        payment_method: null,
        paid: "unpaid",
        timezone,
      });

      // Дублирование на клиентскую БД
      try {
        // const clientApiUrl = envConfig.CLIENT_API_URL || envConfig.ADMIN_PANEL_URL;
        const clientApiUrl = "http://localhost:3000/";
        await syncToClientDatabase(
          newAssignment,
          clientApiUrl,
          organization.name,
          branchId
        );
      } catch (syncError) {
        // Логируем ошибку, но не откатываем транзакцию
        // Запись уже создана в общей БД
        console.error("Sync to client DB failed:", syncError);

        return res.status(201).json({
          success: true,
          data: newAssignment,
          warning: "Assignment created but sync to client database failed",
        });
      }

      // Успешное создание и синхронизация
      return res.status(201).json({
        success: true,
        data: newAssignment,
        message: "Assignment created and synced successfully",
      });
    } catch (error) {
      // Обработка ошибок валидации
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }

      console.error("Error creating assignment:", error);
      next(error);
    }
  }
);

/**
 * GET /assignments/:id
 * Получить запись по ID
 */
AssignmentsBookingServiceRoute.get(
  "/assignments/:id",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const assignment = await Assignment.findByPk(id);

      if (!assignment) {
        return res.status(404).json({
          error: "Assignment not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      console.error("Error fetching assignment:", error);
      next(error);
    }
  }
);

/**
 * GET /assignments
 * Получить список записей с фильтрацией
 */
AssignmentsBookingServiceRoute.get(
  "/assignments",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        organizationId,
        branchId,
        employeeId,
        clientId,
        status,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = req.query;

      const where: any = {};

      if (organizationId) where.organization_id = parseInt(organizationId as string);
      if (branchId) where.branch_id = parseInt(branchId as string);
      if (employeeId) where.employee_id = parseInt(employeeId as string);
      if (clientId) where.client_id = parseInt(clientId as string);
      if (status) where.status = status;

      if (dateFrom || dateTo) {
        where.assignment_date = {};
        if (dateFrom) where.assignment_date[Op.gte] = new Date(dateFrom as string);
        if (dateTo) where.assignment_date[Op.lte] = new Date(dateTo as string);
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const { rows, count } = await Assignment.findAndCountAll({
        where,
        limit: parseInt(limit as string),
        offset,
        order: [
          ["assignment_date", "DESC"],
          ["start_time", "DESC"],
        ],
      });

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count,
          pages: Math.ceil(count / parseInt(limit as string)),
        },
      });
    } catch (error) {
      console.error("Error fetching assignments:", error);
      next(error);
    }
  }
);

export default AssignmentsBookingServiceRoute;

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Управление записями клиентов
 */

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Создать новую запись с синхронизацией на клиентскую БД
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *               - branchId
 *               - client
 *               - employee
 *               - service
 *               - assignmentDate
 *               - startTime
 *               - source
 *             properties:
 *               organizationId:
 *                 type: integer
 *               branchId:
 *                 type: integer
 *               timezone:
 *                 type: string
 *                 default: UTC
 *               client:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   phone:
 *                     type: string
 *               employee:
 *                 type: object
 *               service:
 *                 type: object
 *               additionalServices:
 *                 type: array
 *                 items:
 *                   type: object
 *               assignmentDate:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               notes:
 *                 type: string
 *               source:
 *                 type: string
 *                 enum: [web, mobile, admin, phone]
 *               discount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Запись создана и синхронизирована
 *       400:
 *         description: Ошибка валидации
 *       409:
 *         description: Конфликт времени
 *       500:
 *         description: Внутренняя ошибка сервера
 */
