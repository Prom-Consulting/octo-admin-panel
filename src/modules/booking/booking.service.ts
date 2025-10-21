import { Router } from "express";
import type { NextFunction, Response, Request } from "express";
import Organization from "../organization/Organization.ts";
import { authMiddleware } from "../../middleware/auth.ts";
import jwt from "jsonwebtoken";
import axios, { AxiosError } from "axios";
import Branch from "../organization/Branch.ts";
import { envConfig } from "../../../config/envConfig.ts";

const BookingRoute = Router();

const SERVICES_API_URL =
  "https://lesser-felicdad-promconsulting-79f07228.koyeb.app/services";
const TOKEN_EXPIRATION = "1h";

interface BranchData {
  id: number;
  name: string;
  phone: string;
  address: string;
  isActive: boolean;
}

interface ServiceData {
  id: number;
  name: string;
  price: number;
  branch_id: number;
}

interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  data: T[];
}

interface BranchWithServices extends BranchData {
  services: ServiceData[];
}

interface OrganizationData {
  id: number;
  user_id: number;
  name: string;
  branches: number;
  paidDate: Date;
  isActive: boolean;
  organizationBranches: BranchData[] | BranchWithServices[];
}

interface BookingPayload {
  client: {
    name: string;
    phone: string;
    email?: string;
  };
  parentServiceId?: number;
  service: {
    id: number;
    name: string;
    price: number;
  };
  startTime: string;
  managerId?: number;
  employeeId: number;
  notes?: string;
  source: string;
  assignmentDate: string;
  discount?: number;
  timezone: string;
}

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
const branchIncludeConfig = {
  model: Branch,
  as: "organizationBranches",
  attributes: ["id", "name", "phone", "address", "isActive"],
};

const generateServiceToken = (organizationName: string): string => {
  return jwt.sign({ organizationName }, envConfig.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
  });
};

const fetchServices = async (token: string): Promise<ServiceData[]> => {
  try {
    const response = await axios.get<PaginatedResponse<ServiceData>>(
      SERVICES_API_URL,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          admin_panel: "true",
        },
        timeout: 5000,
      }
    );

    return response.data?.data || [];
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error("Services API error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    return [];
  }
};

const attachServicesToBranches = (
  branches: BranchData[],
  services: ServiceData[]
): BranchWithServices[] => {
  // Оптимизация: создаем Map для O(1) lookup
  const servicesByBranch = services.reduce((acc, service) => {
    if (!acc.has(service.branch_id)) {
      acc.set(service.branch_id, []);
    }
    acc.get(service.branch_id)!.push(service);
    return acc;
  }, new Map<number, ServiceData[]>());

  return branches.map((branch) => ({
    ...branch,
    services: servicesByBranch.get(branch.id) || [],
  }));
};

// ============ ВАЛИДАЦИЯ ============
const validateBookingPayload = (data: any): data is BookingPayload => {
  const errors: string[] = [];

  if (!data.client?.name) errors.push("client.name is required");
  if (!data.client?.phone) errors.push("client.phone is required");
  if (!data.service?.id) errors.push("service.id is required");
  if (!data.startTime) errors.push("startTime is required");
  if (!data.employeeId) errors.push("employeeId is required");
  if (!data.source) errors.push("source is required");
  if (!data.assignmentDate) errors.push("assignmentDate is required");
  if (!data.timezone) errors.push("timezone is required");

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(", ")}`);
  }

  return true;
};

// ============ ЭНДПОИНТЫ ============

/**
 * GET /booking/getOrganizations
 * Получить список всех организаций с филиалами
 */
BookingRoute.get(
  "/getOrganizations",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizations = await Organization.findAll({
        include: [branchIncludeConfig],
      });

      return res.status(200).json({
        message: "success",
        data: organizations,
      });
    } catch (error) {
      console.error("Error fetching organizations:", error);
      next(error);
    }
  }
);

/**
 * GET /booking/getOrganizations/:id
 * Получить организацию по ID с филиалами и сервисами
 */
BookingRoute.get(
  "/getOrganizations/:id",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Валидация ID
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({
          message: "Invalid organization ID",
        });
      }

      const organization = await Organization.findByPk(id, {
        include: [branchIncludeConfig],
      });

      if (!organization) {
        return res.status(404).json({
          message: "Organization not found",
        });
      }

      const orgData = organization.toJSON() as OrganizationData;

      // Получаем сервисы из внешнего API
      const token = generateServiceToken(orgData.name);
      const services = await fetchServices(token);

      // Привязываем сервисы к филиалам
      const branchesWithServices = attachServicesToBranches(
        orgData.organizationBranches as BranchData[],
        services
      );

      return res.status(200).json({
        organization: {
          ...orgData,
          organizationBranches: branchesWithServices,
        },
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      next(error);
    }
  }
);

/**
 * POST /booking
 * Создать новое бронирование
 */
BookingRoute.post(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Валидация входных данных
      validateBookingPayload(req.body);

      const bookingData: BookingPayload = req.body;

      // TODO: Реализовать логику создания бронирования
      // 1. Проверить доступность времени
      // 2. Проверить существование сотрудника
      // 3. Создать запись в БД
      // 4. Отправить уведомления

      return res.status(201).json({
        message: "Booking created successfully",
        data: {
          // bookingId: createdBooking.id,
          status: "pending",
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Validation failed")) {
        return res.status(400).json({
          message: error.message,
        });
      }
      console.error("Error creating booking:", error);
      next(error);
    }
  }
);

export default BookingRoute;

/**
 * @swagger
 * tags:
 *   name: Booking
 *   description: Работа с организациями и их филиалами
 */

/**
 * @swagger
 * /booking/getOrganizations:
 *   get:
 *     summary: Получить список всех организаций с филиалами
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список организаций с их филиалами
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrganizationWithBranches'
 *       401:
 *         description: Неавторизованный доступ
 *       500:
 *         description: Внутренняя ошибка сервера
 *
 * /booking/getOrganizations/{id}:
 *   get:
 *     summary: Получить организацию по ID с филиалами и сервисами
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID организации
 *     responses:
 *       200:
 *         description: Организация с филиалами и привязанными сервисами
 *       400:
 *         description: Некорректный ID
 *       401:
 *         description: Неавторизованный доступ
 *       404:
 *         description: Организация не найдена
 *       500:
 *         description: Внутренняя ошибка сервера
 *
 * /booking:
 *   post:
 *     summary: Создать новое бронирование
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingPayload'
 *     responses:
 *       201:
 *         description: Бронирование создано
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Неавторизованный доступ
 *       500:
 *         description: Внутренняя ошибка сервера
 */
