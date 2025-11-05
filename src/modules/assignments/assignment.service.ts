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
 *   description: Управление клиентскими назначениями (записями, посещениями)
 */

/**
 * @swagger
 * /assignments:
 *   get:
 *     summary: Получить список назначений
 *     description: Возвращает список назначений (записей клиентов) для выбранного филиала. Можно фильтровать по дате, сотруднику и клиенту.
 *     tags: [Assignments]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала (обязательный параметр)
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-10-24
 *         description: Фильтр по дате (локальная таймзона филиала)
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *         description: ID сотрудника (для фильтрации)
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: integer
 *         description: ID клиента (для фильтрации)
 *     responses:
 *       200:
 *         description: Успешно. Возвращает список назначений.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Некорректный запрос — не указан branchId или филиал не найден.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

/**
 * @swagger
 * /assignments/{id}:
 *   get:
 *     summary: Получить данные конкретного назначения
 *     description: Возвращает полные данные по конкретному назначению (записи клиента).
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID назначения
 *     responses:
 *       200:
 *         description: Успешно. Возвращает объект назначения.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       404:
 *         description: Назначение с указанным ID не найдено.
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Создать новое назначение
 *     description: Создаёт новую запись клиента к сотруднику. Проверяется наличие организации, филиала, клиента и сотрудника. В случае конфликта времени возвращает ошибку.
 *     tags: [Assignments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssignmentDto'
 *     responses:
 *       200:
 *         description: Назначение успешно создано.
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
 *                   example: "Assignment created successfully"
 *       404:
 *         description: Не найдены организация, филиал, клиент или сотрудник.
 *       409:
 *         description: Конфликт по времени — сотрудник уже занят на выбранное время.
 *       400:
 *         description: Ошибка валидации входных данных.
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

/**
 * @swagger
 * /assignments/{id}:
 *   patch:
 *     summary: Обновить данные назначения
 *     description: Обновляет данные существующего назначения.
 *       Если назначение оплачено (paid = "paid"), автоматически создаётся запись в бухгалтерском учёте (Accounting).
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
 *           Если оплата произведена — создана запись в учёте (Accounting).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Assignment updated successfully"
 *                 assignment:
 *                   $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Ошибка валидации (например, время окончания раньше начала, некорректный статус или способ оплаты).
 *       404:
 *         description: Назначение, сотрудник или пользователь не найдены.
 *       401:
 *         description: Неавторизованный доступ (отсутствует или некорректный JWT-токен).
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

/**
 * @swagger
 * /assignments/{id}:
 *   delete:
 *     summary: Удалить назначение
 *     description: Удаляет назначение, если оно не оплачено.
 *       Оплаченные назначения удалить нельзя.
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID назначения
 *     responses:
 *       200:
 *         description: Назначение успешно удалено.
 *       400:
 *         description: Нельзя удалить оплаченную запись или назначение не найдено.
 *       404:
 *         description: Назначение не найдено.
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Assignment:
 *       type: object
 *       description: Подробная информация о назначении клиента к сотруднику.
 *       properties:
 *         id: { type: integer, example: 1 }
 *         organization_id: { type: integer, example: 3 }
 *         branch_id: { type: integer, example: 2 }
 *         client_id: { type: integer, example: 12 }
 *         employee_id: { type: integer, example: 5 }
 *         client_snapshot:
 *           type: object
 *           description: Данные клиента на момент записи
 *           properties:
 *             first_name: { type: string, example: "Айгерим" }
 *             last_name: { type: string, example: "Токтосунова" }
 *             phone: { type: string, example: "+996500112233" }
 *         employee_snapshot:
 *           type: object
 *           description: Данные сотрудника на момент записи
 *           properties:
 *             first_name: { type: string, example: "Эрлан" }
 *             last_name: { type: string, example: "Усенов" }
 *             role: { type: string, example: "Парикмахер" }
 *         manager_snapshot:
 *           type: object
 *           nullable: true
 *           description: Данные администратора, внесшего изменения
 *           properties:
 *             first_name: { type: string }
 *             last_name: { type: string }
 *             role: { type: string }
 *         service_snapshot:
 *           type: object
 *           description: Основная услуга
 *           properties:
 *             name: { type: string, example: "Стрижка" }
 *             price: { type: number, example: 800 }
 *             duration: { type: integer, example: 60 }
 *         additional_services:
 *           type: array
 *           nullable: true
 *           description: Дополнительные услуги
 *           items:
 *             $ref: '#/components/schemas/ServiceInfo'
 *         assignment_date: { type: string, format: date-time, example: "2025-10-25T03:00:00.000Z" }
 *         start_time: { type: string, example: "09:00" }
 *         end_time: { type: string, example: "10:30" }
 *         status:
 *           type: string
 *           enum: [new, pending, confirmed, completed, cancelled]
 *           example: "new"
 *         paid:
 *           type: string
 *           enum: [paid, unpaid, refund]
 *           example: "unpaid"
 *         payment_method:
 *           type: object
 *           nullable: true
 *           description: Способ оплаты, если запись оплачена
 *           properties:
 *             methods:
 *               type: array
 *               items: { $ref: '#/components/schemas/PaymentMethod' }
 *             total: { type: number, example: 1500 }
 *         discount: { type: number, example: 10 }
 *         final_price: { type: number, example: 1350 }
 *         total_duration: { type: integer, example: 90 }
 *         timezone: { type: string, example: "Asia/Bishkek" }
 *         notes: { type: string, nullable: true, example: "Просьба не опаздывать" }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [cash, card, transfer, gift_certificate, other]
 *           example: "card"
 *         amount: { type: number, example: 1500 }
 *         name: { type: string, nullable: true, example: "VISA" }
 *
 *     CreateAssignmentDto:
 *       type: object
 *       required: [organizationId, branchId, clientId, employeeId, service, assignmentDate, startTime]
 *       properties:
 *         organizationId: { type: integer }
 *         branchId: { type: integer }
 *         clientId: { type: integer }
 *         employeeId: { type: integer }
 *         service: { $ref: '#/components/schemas/ServiceInfo' }
 *         additionalServices:
 *           type: array
 *           items: { $ref: '#/components/schemas/ServiceInfo' }
 *         assignmentDate: { type: string, format: date, example: "2025-10-25" }
 *         startTime: { type: string, example: "09:00" }
 *         notes: { type: string, nullable: true }
 *         source: { type: string, example: "manual" }
 *         discount: { type: number, example: 10 }
 *
 *     UpdateAssignmentDto:
 *       type: object
 *       properties:
 *         service: { $ref: '#/components/schemas/ServiceInfo' }
 *         additionalServices:
 *           type: array
 *           items: { $ref: '#/components/schemas/ServiceInfo' }
 *         assignmentDate: { type: string, format: date }
 *         startTime: { type: string }
 *         endTime: { type: string }
 *         employeeId: { type: integer }
 *         notes: { type: string }
 *         status: { type: string, enum: [new, pending, confirmed, completed, cancelled] }
 *         discount: { type: number }
 *         paid: { type: string, enum: [paid, unpaid, refund] }
 *         paymentMethod:
 *           type: array
 *           items: { $ref: '#/components/schemas/PaymentMethod' }
 *         certificateNumber:
 *           type: string
 *           description: Номер подарочного сертификата (если выбран способ оплаты gift_certificate)
 *
 *     ServiceInfo:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         name: { type: string }
 *         price: { type: number }
 *         duration: { type: integer }
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error: { type: string, example: "Branch not found" }
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */