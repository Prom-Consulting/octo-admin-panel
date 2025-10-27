import express from "express";
import { authenticateToken, authorizeRoles } from "../../middleware/authStaffMiddleware.ts";
import {
  createAssignment,
  deleteAssignment,
  editAssignment,
  getAssignmentById,
  getListAssignments,
} from "./assignment.controller.ts";

const AssignmentsServiceRoute = express.Router();

AssignmentsServiceRoute.get("/", getListAssignments);
AssignmentsServiceRoute.get("/:id", getAssignmentById);
AssignmentsServiceRoute.post("/", createAssignment);
AssignmentsServiceRoute.patch("/:id",
  authenticateToken, authorizeRoles("manager", "owner"), editAssignment);

AssignmentsServiceRoute.delete("/:id", deleteAssignment);

export default  AssignmentsServiceRoute;

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Управление клиентскими назначениями (записями)
 */

/**
 * @swagger
 * /assignments:
 *   get:
 *     summary: Получить список назначений
 *     tags: [Assignments]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-10-24
 *         description: Фильтр по дате (локальной для филиала)
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *         description: ID сотрудника
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Отсутствует branchId или неверные данные
 *       404:
 *         description: Филиал не найден
 */

/**
 * @swagger
 * /assignments/{id}:
 *   get:
 *     summary: Получить данные конкретной записи.
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID записи
 *     responses:
 *       200:
 *         description: Данные назначения.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       404:
 *         description: Назначение не найдено
 */

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Создать новое назначение
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
 *       200:
 *         description: Успешное создание
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Assignment created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Ошибка валидации или пересечение по времени
 *       404:
 *         description: Не найден клиент / сотрудник / филиал
 */

/**
 * @swagger
 * /assignments/{id}:
 *   patch:
 *     summary: Обновить назначение
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *         description: Неверные данные (валидация, время и т.д.)
 *       404:
 *         description: Назначение или пользователь не найден
 *       409:
 *         description: Конфликт времени — сотрудник уже занят
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
 *       400:
 *         description: Попытка удалить оплаченную запись
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
 *         organization_id:
 *           type: integer
 *         branch_id:
 *           type: integer
 *         client_id:
 *           type: integer
 *         employee_id:
 *           type: integer
 *         service_snapshot:
 *           type: object
 *           properties:
 *             id: { type: integer }
 *             name: { type: string }
 *             price: { type: number }
 *             duration: { type: integer }
 *         additional_services:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id: { type: integer }
 *               name: { type: string }
 *               price: { type: number }
 *               duration: { type: integer }
 *         assignment_date:
 *           type: string
 *           format: date-time
 *           example: 2025-10-24T00:00:00.000Z
 *         start_time:
 *           type: string
 *           example: "07:00"
 *         end_time:
 *           type: string
 *           example: "08:30"
 *         status:
 *           type: string
 *           enum: [new, pending, confirmed, completed, cancelled]
 *         paid:
 *           type: string
 *           enum: [paid, unpaid, refund]
 *         payment_method:
 *           type: string
 *           nullable: true
 *         discount:
 *           type: number
 *         final_price:
 *           type: number
 *         total_duration:
 *           type: integer
 *         timezone:
 *           type: string
 *           example: "Asia/Bishkek"
 *         notes:
 *           type: string
 *           nullable: true
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
 *           properties:
 *             id: { type: integer }
 *             name: { type: string }
 *             price: { type: number }
 *             duration: { type: integer }
 *         additionalServices:
 *           type: array
 *           items:
 *             type: object
 *         assignmentDate:
 *           type: string
 *           format: date
 *           example: 2025-10-25
 *         startTime:
 *           type: string
 *           example: "09:00"
 *         notes:
 *           type: string
 *           nullable: true
 *         source:
 *           type: string
 *           example: "manual"
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
 *           format: date
 *         startTime:
 *           type: string
 *         endTime:
 *           type: string
 *         status:
 *           type: string
 *           enum: [new, pending, confirmed, completed, cancelled]
 *         notes:
 *           type: string
 *         discount:
 *           type: number
 *         paid:
 *           type: string
 *           enum: [paid, unpaid, refund]
 *         paymentMethod:
 *           type: string
 *           example: "cash"
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */