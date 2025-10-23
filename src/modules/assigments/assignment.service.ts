import express, {type Request, type Response, type NextFunction } from "express";
import Assignment, {
  ASSIGMENT_PAID,
  ASSIGNMENT_STATUSES,
  type AssignmentAttributes, type AssignmentPaid,
  type AssignmentStatus,
} from "./Assignment.ts";
import transformPrices from "../../utils /transformPrices.ts";
import Organization from "../organization/Organization.ts";
import { DateTime } from "luxon";
import z from "zod";
import Client from "../client/Client.ts";
import OrganizationStaff from "../staff/OrganizationStaff.ts";
import { checkTimeOverlap } from "./checkTimeOverlap.ts";
import { CreateAssignmentSchema } from "./assignment.schema.ts";
import Branch from "../organization/Branch.ts";
import { Op, type WhereOptions } from "sequelize";
import { authenticateToken, authorizeRoles } from "../../middleware/authStaffMiddleware.ts";
import axios from "axios";

const AssignmentsServiceRoute = express.Router();

AssignmentsServiceRoute.get("/", async (req, res, next) => {
  try {
    const { employeeId, branchId } = req.query;
    const date = req.query.date as string;

    const where: WhereOptions<Assignment> = {};

    if (!branchId) {
      return res.status(400).send({ error: "branchId is required" });
    }

    const branch = await Branch.findByPk(Number(branchId));
    if (!branch) {
      return res.status(400).send({ error: "Branch not found" });
    }

    if (date) {
      const tz = branch.timezone || "UTC";
      const startOfDay = DateTime.fromISO(date, { zone: tz })
        .startOf("day")
        .toUTC()
        .toJSDate();

      const endOfDay = DateTime.fromISO(date, { zone: tz })
      .endOf("day")
      .toUTC()
      .toJSDate();
      where.assignment_date = { [Op.between]: [startOfDay, endOfDay] };
    }

    if (branch) {
      where.branch_id = branch.id;
    }

    if (employeeId) {
      where.employee_id = Number(employeeId);
    }

    const assignments = await Assignment.findAll({ where });
    res.send(assignments);
  } catch (e) {
    console.log(e);
    next(e);
  }
});

AssignmentsServiceRoute.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByPk(id);

    if (!assignment) {
      return res.status(404).send({error: "No Assignment found with this id"});
    }

    res.send(assignment);
  } catch (e) {
    console.log(e);
    next(e);
  }
});

AssignmentsServiceRoute.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateAssignmentSchema.parse(req.body);

    const {
      organizationId,
      branchId,
      clientId,
      employeeId,
      service,
      additionalServices,
      assignmentDate,
      startTime,
      notes,
      source,
      discount,
    } = data;

    // --- Проверяем организацию, клиента, сотрудника ---
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const employee = await OrganizationStaff.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // const workingDates = await WorkingDates.findOne({
    //   where: {
    //     branch_id: branchId,
    //     staff_id: employee.id,
    //   }
    // });
    //
    // if(!workingDates || (workingDates && workingDates.is_day_off)) {
    //   return res.status(400).send({ error: "The employee is not working on this date or has the day off." });
    // }

    const normalizePrice = (s: any) => ({
      ...s,
      price: transformPrices(s.price),
    });

    const normalizedService = normalizePrice(service);
    const normalizedAdditional = additionalServices.map(normalizePrice);

    const totalPrice =
      normalizedService.price +
      normalizedAdditional.reduce((sum: number, s: any) => sum + s.price, 0);

    const totalDuration = service.duration +
      additionalServices.reduce((sum: number, s: any) => sum + s.duration, 0);

    const finalPrice = Math.max(0, Math.round(totalPrice - (totalPrice * discount) / 100));

    // --- Формирование времени и проверка пересечений ---
    const startDateTime = DateTime.fromISO(`${assignmentDate}T${startTime}`, {
      zone: branch.timezone,
    });

    const endDateTime = startDateTime.plus({ minutes: totalDuration });
    const assignmentDateUTC = startDateTime.startOf("day").toUTC().toJSDate();
    const startTimeUTC = startDateTime.toUTC().toFormat("HH:mm");
    const endTimeUTC = endDateTime.toUTC().toFormat("HH:mm");

    const overlap = await checkTimeOverlap(
      employeeId,
      branchId,
      assignmentDateUTC,
      startTimeUTC,
      endTimeUTC
    );
    if (overlap) {
      return res.status(409).json({
        error: "The employee is already booked at this time",
        details: { startTimeUTC, endTimeUTC, timezone:branch.timezone },
      });
    }

    // --- Создание записи ---
    const newAssignment = await Assignment.create({
      organization_id: organizationId,
      branch_id: branchId,
      assignment_date: assignmentDateUTC,
      start_time: startTimeUTC,
      end_time: endTimeUTC,
      client_id: client.id,
      client_snapshot: {
        first_name: client.first_name,
        last_name: client.last_name || null,
        phone: client.phone_number,
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
      additional_services:  normalizedAdditional.length > 0
        ? normalizedAdditional.map((s: any) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration: s.duration,
        }))
        : null,
      status: "new",
      notes: notes || null,
      source,
      discount: discount || 0,
      final_price: finalPrice,
      total_duration: totalDuration,
      payment_method: null,
      paid: "unpaid",
      timezone: branch.timezone,
    });

    return res.send({
      success: true,
      data: newAssignment,
      message: "Assignment created successfully",
    });
  } catch (error) {
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
});

AssignmentsServiceRoute.patch("/:id",
  authenticateToken, authorizeRoles("manager"),
  async (req, res, next) => {
  try {
    const { id } = req.params;
    const manager = req.user!;

    const assignment = await Assignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const updates: Partial<AssignmentAttributes> = {};

    const {
      service,
      additionalServices,
      startTime,
      endTime,
      assignmentDate,
      employeeId,
      notes,
      status,
      discount,
      paid,
      paymentMethod,
    } = req.body;

    if (status && !ASSIGNMENT_STATUSES.includes(status as AssignmentStatus)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    if (status) updates.status = status;
    if (notes) updates.notes = notes;

    let employeeSnapshot = assignment.employee_snapshot;
    if (employeeId) {
      const employee = await OrganizationStaff.findByPk(employeeId);
      if (!employee) return res.status(404).json({ error: "Employee not found" });
      updates.employee_id = employeeId;
      employeeSnapshot = {
        first_name: employee.firstname,
        last_name: employee.lastname || null,
        role: employee.role,
      };
      updates.employee_snapshot = employeeSnapshot;
    }

    let totalPrice = 0;
    let totalDuration = 0;

    if (service) {
      const normalizedService = { ...service, price: transformPrices(service.price) };
      updates.service_id = service.id;
      updates.service_snapshot = {
        name: service.name,
        price: normalizedService.price,
        duration: service.duration,
      };
      totalPrice += normalizedService.price;
      totalDuration += service.duration;
    } else {
      totalPrice += assignment.final_price;
      totalDuration += assignment.total_duration;
    }

    const currentDate = assignmentDate
      ? DateTime.fromISO(assignmentDate, { zone: assignment.timezone })
      : DateTime.fromJSDate(assignment.assignment_date, { zone: "utc" }).setZone(assignment.timezone).startOf("day");

    const start = startTime ?? assignment.start_time;
    const end = endTime ?? assignment.end_time;

    const startDateTime = DateTime.fromISO(`${currentDate.toISODate()}T${start}`, { zone: assignment.timezone });
    let endDateTime = DateTime.fromISO(`${currentDate.toISODate()}T${end}`, { zone: assignment.timezone });

    if (!endTime) {
      endDateTime = startDateTime.plus({ minutes: totalDuration });
    }

    if (endDateTime <= startDateTime) {
      return res.status(400).json({ error: "End time cannot be earlier than start time" });
    }

    if (assignmentDate) updates.assignment_date = startDateTime.toUTC().toJSDate();
    if (startTime) updates.start_time = startDateTime.toUTC().toFormat("HH:mm");
    if (endTime) updates.end_time = endDateTime.toUTC().toFormat("HH:mm");

    // if (employeeId || assignmentDate || startTime || endTime) {
    //   const checkEmployeeId = employeeId ?? assignment.employee_id;
    //   const checkAssignmentDate = updates.assignment_date ?? assignment.assignment_date;
    //   const checkStartTime = updates.start_time ?? assignment.start_time;
    //   const checkEndTime = updates.end_time ?? assignment.end_time;
    //
    //   const overlap = await checkTimeOverlap(
    //     checkEmployeeId,
    //     assignment.branch_id,
    //     checkAssignmentDate,
    //     checkStartTime,
    //     checkEndTime
    //   );
    //   if (overlap) {
    //     return res.status(409).json({ error: "The employee is already booked at this time" });
    //   }
    // }

    const normalizedAdditional = Array.isArray(additionalServices)
      ? additionalServices.map((s: any) => ({ ...s, price: transformPrices(s.price) }))
      : [];

    if (normalizedAdditional.length > 0) {
      updates.additional_services = normalizedAdditional;
      for (const s of normalizedAdditional) {
        totalPrice += s.price;
        totalDuration += s.duration;
      }
    }

    const discountValue = discount ?? assignment.discount ?? 0;
    updates.discount = discountValue;
    updates.final_price = Math.max(0, Math.round(totalPrice - (totalPrice * discountValue) / 100));
    updates.total_duration = totalDuration;

    const managerDb = await OrganizationStaff.scope("managers").findByPk(manager.id);
    if (!managerDb) return res.status(404).json({ error: "Manager not found" });
    updates.manager_id = manager.id;
    updates.manager_snapshot = {
      first_name: managerDb.firstname,
      last_name: managerDb.lastname || null,
      role: managerDb.role,
    };

    if (paid) {
      if (!ASSIGMENT_PAID.includes(paid as AssignmentPaid)) {
        return res.status(400).json({ error: "Invalid paid value" });
      }
      updates.paid = paid;
      if (paid && paid !=="refund" && !paymentMethod) {
        return res.status(400).json({ error: "Payment method required when marking as paid" });
      }
      updates.payment_method = paymentMethod;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    if (paid === "refund") {
      try {
        await axios.patch(
          `http://localhost:3000/accounting/refund/${assignment.id}?branch_id=${assignment.branch_id}`,
          {
            status: "refund",
            refund_date: DateTime.now().setZone(assignment.timezone).toUTC().toJSDate(),
          },
          {
            headers: {
              authorization: `Bearer ${managerDb.token}`,
              "Content-Type": "application/json",
            },
          }
        );

        return res.send({
          message:
            "Assignment updated successfully. Related accounting record marked as 'refund'.",
          assignment,
        });
      } catch (e) {
        return res.status(400).send({ error: e });
      }
    }


    if (paid === "paid" && status === "completed") {
      const client = assignment.client_snapshot;
      const employee = assignment.employee_snapshot;
      const managerSnap = updates.manager_snapshot;

      if (
        !updates.payment_method ||
        !assignment.total_duration ||
        !updates.final_price
      ) {
        return res
          .status(400)
          .send({ error: "Missing required fields for accounting" });
      }

      const newAccounting = {
        branch_id: assignment.branch_id,
        client_id: assignment.client_id,
        client_snapshot: {
          first_name: client.first_name,
          last_name: client.last_name || null,
          phone: client.phone,
        },
        employee_id: assignment.employee_id,
        employee_snapshot: employee,
        manager_id: updates.manager_id,
        manager_snapshot: managerSnap,
        assignment_id: assignment.id,
        duration: assignment.total_duration,
        payment_method: updates.payment_method,
        discount: updates.discount || assignment.discount || 0,
        date: DateTime.now().setZone(assignment.timezone).toUTC().toJSDate(),
        timezone: assignment.timezone,
        amount: updates.final_price,
        status: "success",
      }

      try {
        await axios.post("http://localhost:3000/accounting?branch_id=" + assignment.branch_id, {...newAccounting}, {
          headers: {
            authorization: `Bearer ${managerDb.token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (e) {
        console.log(e);
        return res.status(400).send({ error: e });
      }
    }
    await assignment.update(updates);
    return res.json({ message: "Assignment updated successfully", assignment });
  } catch (e) {
    console.error(e);
    next(e);
  }
});

AssignmentsServiceRoute.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByPk(id);

    if (!assignment) {
      return res.status(400).json({error: "Assignment not found"});
    }

    if (assignment.paid === "paid") {
      return res.status(400).json({error: "You cannot delete a paid assignment."});
    }

    await assignment.destroy();
  } catch (e) {
    next(e);
  }
});


export default  AssignmentsServiceRoute;

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Управление записями (назначениями) клиентов
 */

/**
 * @swagger
 * /assignments:
 *   get:
 *     summary: Получить список всех записей
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *         description: ID филиала
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтрация по дате (в формате YYYY-MM-DD)
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *         description: ID сотрудника
 *     responses:
 *       200:
 *         description: Успешный ответ со списком назначений
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Assignment'
 *       401:
 *         description: Неавторизован
 */

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Создать новую запись
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssignmentDto'
 *     responses:
 *       201:
 *         description: Запись успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Ошибка валидации или конфликт времени
 *       401:
 *         description: Неавторизован
 */

/**
 * @swagger
 * /assignments/{id}:
 *   get:
 *     summary: Получить данные конкретной записи
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID записи
 *     responses:
 *       200:
 *         description: Данные записи
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Assignment'
 *       404:
 *         description: Назначение не найдено
 *       401:
 *         description: Неавторизован
 */

/**
 * @swagger
 * /assignments/{id}:
 *   patch:
 *     summary: Обновить данные записи
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID записи
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAssignmentDto'
 *     responses:
 *       200:
 *         description: Назначение успешно обновлено
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Назначение не найдено
 */

/**
 * @swagger
 * /assignments/{id}:
 *   delete:
 *     summary: Удалить назначение
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Назначение успешно удалено
 *       404:
 *         description: Назначение не найдено
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Assignment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         organizationId:
 *           type: integer
 *         branchId:
 *           type: integer
 *         clientId:
 *           type: integer
 *         employeeId:
 *           type: integer
 *         service:
 *           type: object
 *           description: Основная услуга
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             duration:
 *               type: integer
 *             price:
 *               type: number
 *         additionalServices:
 *           type: array
 *           description: Дополнительные услуги
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               name:
 *                 type: string
 *               duration:
 *                 type: integer
 *               price:
 *                 type: number
 *         assignmentDate:
 *           type: string
 *           format: date-time
 *         startTime:
 *           type: string
 *           format: time
 *         endTime:
 *           type: string
 *           format: time
 *         notes:
 *           type: string
 *           nullable: true
 *         source:
 *           type: string
 *           description: Источник (например, "online", "manual")
 *         discount:
 *           type: number
 *           description: Скидка на услугу (в % или сумме)
 *         status:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CreateAssignmentDto:
 *       type: object
 *       required:
 *         - organizationId
 *         - branchId
 *         - clientId
 *         - employeeId
 *         - service
 *         - assignmentDate
 *         - startTime
 *       properties:
 *         organizationId:
 *           type: integer
 *         branchId:
 *           type: integer
 *         clientId:
 *           type: integer
 *         employeeId:
 *           type: integer
 *         service:
 *           type: object
 *         additionalServices:
 *           type: array
 *           items:
 *             type: object
 *         assignmentDate:
 *           type: string
 *           format: date
 *           example: 2025-10-22
 *         startTime:
 *           type: string
 *           example: "10:00"
 *         notes:
 *           type: string
 *           nullable: true
 *         source:
 *           type: string
 *           example: "online"
 *         discount:
 *           type: number
 *           example: 10
 *
 *     UpdateAssignmentDto:
 *       type: object
 *       properties:
 *         service:
 *           type: object
 *         additionalServices:
 *           type: array
 *         assignmentDate:
 *           type: string
 *         startTime:
 *           type: string
 *         endTime:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *         notes:
 *           type: string
 *         discount:
 *           type: number
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
