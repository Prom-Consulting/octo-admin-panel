import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { Op } from "sequelize";
import Assignment from "../assigments/Assignment.ts";
import { authMiddleware } from "../../middleware/auth.ts";
import { createAssignment, getAssignmentById } from "../assigments/assignment.controller.ts";

const AssignmentsBookingServiceRoute = Router();

AssignmentsBookingServiceRoute.post("/assignments", authMiddleware, createAssignment);
AssignmentsBookingServiceRoute.get("/assignments/:id", authMiddleware, getAssignmentById);

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
