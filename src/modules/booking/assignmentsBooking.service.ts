import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { Op } from "sequelize";
import Assignment from "../assignments/Assignment.ts";
import { authMiddleware } from "../../middleware/auth.ts";
import { createAssignment, getAssignmentById } from "../assignments/assignment.controller.ts";

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
 * /booking/assignments:
 *   post:
 *     summary: Создать запись (assignment)
 *     tags: [Booking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               branch_id:
 *                 type: integer
 *                 example: 1
 *               staff_id:
 *                 type: integer
 *                 example: 12
 *               client_id:
 *                 type: integer
 *                 example: 55
 *               service_id:
 *                 type: integer
 *                 example: 8
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-05T09:00:00Z"
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-05T10:00:00Z"
 *               comment:
 *                 type: string
 *                 example: "Первичный приём клиента"
 *     responses:
 *       201:
 *         description: Задание успешно создано
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Неверные данные в запросе
 *       401:
 *         description: Неавторизован
 *       500:
 *         description: Ошибка сервера
 *
 * /booking/assignments/{id}:
 *   get:
 *     summary: Получить запись по ID
 *     tags: [AssignmentsBooking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID задания
 *     responses:
 *       200:
 *         description: Успешное получение данных задания
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       401:
 *         description: Неавторизован
 *       404:
 *         description: Задание не найдено
 *       500:
 *         description: Ошибка сервера
 */
