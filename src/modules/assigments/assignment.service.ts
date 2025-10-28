import express from "express";
import { authenticateToken } from "../../middleware/authStaffMiddleware.ts";
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
  authenticateToken, editAssignment);

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
 *         name: branch_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала (обязателен)
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-10-24
 *         description: Фильтр по дате. Дата передаётся в локальной таймзоне филиала, а фильтрация выполняется по диапазону UTC.
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: integer
 *         description: ID сотрудника (необязательно)
 *       - in: query
 *         name: client_id
 *         schema:
 *           type: integer
 *         description: ID клиента (необязательно)
 *     responses:
 *       200:
 *         description: Успешный ответ со списком назначений
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Не указан branch_id или филиал не найден
 */

/**
 * @swagger
 * /assignments/{id}:
 *   get:
 *     summary: Получить данные конкретной записи
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
 *         description: Данные назначения
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssignmentDto'
 *     responses:
 *       200:
 *         description: Назначение успешно создано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Assignment'
 *                 message:
 *                   type: string
 *                   example: Assignment created successfully
 *       404:
 *         description: Организация, филиал, клиент или сотрудник не найдены
 *       409:
 *         description: Пересечение по времени — сотрудник уже занят
 *       400:
 *         description: Ошибка валидации данных
 */

/**
 * @swagger
 * /assignments/{id}:
 *   patch:
 *     summary: Обновить данные назначения
 *     description: |
 *       Обновляет информацию о назначении (услуги, время, статус, оплату и т.д.).
 *       Если назначение имеет статус **completed** и оплачено (**paid**),
 *       автоматически создаётся запись в модуле **Accounting** на другом бэкенде.
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID назначения
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAssignmentDto'
 *     responses:
 *       200:
 *         description: Назначение успешно обновлено.
 *           Если назначение выполнено и оплачено — создана запись в учёте (Accounting).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Assignment'
 *                 message:
 *                   type: string
 *                   example: Assignment updated successfully (Accounting entry created)
 *       400:
 *         description: Неверные данные (валидация, время и т.д.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Назначение, сотрудник или пользователь не найдены
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Конфликт времени — сотрудник уже занят
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /assignments/{id}:
 *   delete:
 *     summary: Удалить назначение
 *     tags: [Assignments]
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
 *         - organization_id
 *         - branch_id
 *         - client_id
 *         - employee_id
 *         - service
 *         - assignment_date
 *         - start_time
 *       properties:
 *         organization_id:
 *           type: integer
 *         branch_id:
 *           type: integer
 *         client_id:
 *           type: integer
 *         employee_id:
 *           type: integer
 *         service:
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
 *         assignment_date:
 *           type: string
 *           format: date
 *           example: 2025-10-25
 *         start_time:
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
 *         additional_services:
 *           type: array
 *         assignment_date:
 *           type: string
 *           format: date
 *         start_time:
 *           type: string
 *         end_time:
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
 *         payment_method:
 *           type: string
 *           example: "cash"
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */