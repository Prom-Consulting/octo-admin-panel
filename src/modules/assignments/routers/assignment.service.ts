import express from "express";
import { authenticateToken, authorizeRoles } from "../../../middleware/authorization/authUserMiddleware.ts";
import {
  createAssignment,
  deleteAssignment,
  editAssignmentBasic,
  getAssignmentById,
  getListAssignments, payAssignment, refundAssignment,
} from "../controllers/assignment.controller.ts";
import { checkBranchMiddleware, checkOrganizationMiddleware } from "../../../middleware/authorization/checkOrganizationMiddleware.ts";

const AssignmentsServiceRoute = express.Router();

AssignmentsServiceRoute.use(authenticateToken);

AssignmentsServiceRoute.get("/",
  authenticateToken,
  checkBranchMiddleware,
  getListAssignments
);
AssignmentsServiceRoute.get("/:id",
  checkBranchMiddleware,
  getAssignmentById
);
AssignmentsServiceRoute.post("/",
  checkOrganizationMiddleware,
  checkBranchMiddleware,
  createAssignment
);
AssignmentsServiceRoute.patch("/:id",
  editAssignmentBasic
);

AssignmentsServiceRoute.patch("/:id/pay",
  authorizeRoles("owner", "manager"),
  payAssignment
);
AssignmentsServiceRoute.patch("/:id/refund",
  authorizeRoles("owner", "manager"),
  refundAssignment
);

AssignmentsServiceRoute.delete("/:id",
  authorizeRoles("owner", "manager"),
  deleteAssignment
);

export default  AssignmentsServiceRoute;

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Управление клиентскими назначениями (записями, посещениями). Для владельца, менеджера и сотрудника. Админ доступа не имеет
 */

/**
 * @swagger
 * /assignments:
 *   get:
 *     summary: Получить список назначений. Сотрудник может только
 *     description: Возвращает список назначений (записей клиентов) для выбранного филиала.
 *       Можно фильтровать по дате, сотруднику и клиенту. Сотрудник может получить лишь свои записи.
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы (пагинация)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Количество элементов на странице (пагинация)
 *     responses:
 *       200:
 *         description: Успешно. Возвращает список назначений с пагинацией.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 42
 *                     pages:
 *                       type: integer
 *                       example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Assignment'
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
 *     summary: Получить данные конкретного назначения. Сотрудник может только свои
 *     description: Возвращает полные данные по конкретному назначению (записи клиента).
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID назначения
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала, к которому относится назначение
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
 *     summary: Создать новое назначение. Сотрудник может только свои
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
 *     summary: Редактировать назначение. Сотрудник может только свои
 *     description: |
 *       Обновляет основную информацию о назначении.
 *       Сотрудник может редактировать **только свои** назначения.
 *       Владельцы и менеджеры могут редактировать любые.
 *       Статусы записи: "new", "scheduled", "completed", "canceled"
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
 *             type: object
 *             properties:
 *               service:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 12
 *                   name:
 *                     type: string
 *                     example: "Массаж лица"
 *                   duration:
 *                     type: integer
 *                     example: 60
 *                   price:
 *                     type: number
 *                     example: 1500
 *               additionalServices:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     name:
 *                       type: string
 *                       example: "Пилинг"
 *                     duration:
 *                       type: integer
 *                       example: 30
 *                     price:
 *                       type: number
 *                       example: 700
 *               startTime:
 *                 type: string
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 example: "11:30"
 *               assignmentDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-11-15"
 *               employeeId:
 *                 type: integer
 *                 example: 7
 *               notes:
 *                 type: string
 *                 example: "Клиент предпочитает мягкий массаж"
 *               status:
 *                 type: string
 *                 example: "confirmed"
 *               discount:
 *                 type: number
 *                 example: 10
 *     responses:
 *       200:
 *         description: Назначение успешно обновлено
 *         content:
 *           application/json:
 *             example:
 *               message: "Assignment updated successfully"
 *               data:
 *                 id: 32
 *                 status: "confirmed"
 *                 final_price: 1980
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             example:
 *               error: "Invalid status value"
 *       403:
 *         description: Сотрудник пытается изменить чужое назначение
 *       404:
 *         description: Назначение или сотрудник не найдены
 *       500:
 *         description: Внутренняя ошибка сервера
 */

/**
 * @swagger
 * /assignments/{id}/pay:
 *   patch:
 *     summary: Оплатить назначение. Только менеджер и владелец
 *     description: |
 *       Помечает назначение как оплаченное и создаёт запись в бухгалтерском учёте (Accounting).
 *       Этот эндпоинт обычно используется менеджером или владельцем.
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
 *             type: object
 *             properties:
 *               paymentMethod:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: "cash"
 *                     amount:
 *                       type: number
 *                       example: 2500
 *               discount:
 *                 type: number
 *                 example: 5
 *               certificateNumber:
 *                 type: string
 *                 example: "CERT-2025-001"
 *           example:
 *             paymentMethod:
 *               - type: "cash"
 *                 amount: 2500
 *             discount: 5
 *             certificateNumber: "CERT-2025-001"
 *     responses:
 *       200:
 *         description: Оплата прошла успешно
 *         content:
 *           application/json:
 *             example:
 *               message: "Assignment paid successfully"
 *               data:
 *                 id: 32
 *                 paid: "paid"
 *                 final_price: 2375
 *       400:
 *         description: Не указан способ оплаты
 *         content:
 *           application/json:
 *             example:
 *               error: "Payment method is required"
 *       404:
 *         description: Назначение не найдено
 *       500:
 *         description: Внутренняя ошибка сервера
 */

/**
 * @swagger
 * /assignments/{id}/refund:
 *   patch:
 *     summary: Возврат оплаты по назначению. Только менеджер и владелец
 *     description: |
 *       Производит возврат ранее оплаченного назначения.
 *       Создаёт корректирующую запись в бухгалтерском учёте.
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
 *     responses:
 *       200:
 *         description: Возврат успешно выполнен
 *         content:
 *           application/json:
 *             example:
 *               message: "Assignment refunded successfully"
 *               data:
 *                 id: 32
 *                 paid: "refund"
 *       404:
 *         description: Назначение не найдено
 *       500:
 *         description: Внутренняя ошибка сервера
 */

/**
 * @swagger
 * /assignments/{id}:
 *   delete:
 *     summary: Удалить назначение. Только менеджер и владелец
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
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *
 *     Assignment:
 *       type: object
 *       description: Подробная информация о назначении клиента к сотруднику.
 *       properties:
 *         id: { type: integer, example: 1 }
 *         organization_id: { type: integer, example: 3 }
 *         branch_id: { type: integer, example: 2 }
 *         client_id: { type: string, example: "12" }
 *         employee_id: { type: integer, example: 5 }
 *
 *         client_snapshot:
 *           type: object
 *           properties:
 *             first_name: { type: string }
 *             last_name: { type: string, nullable: true }
 *             phone_number: { type: string }
 *
 *         employee_snapshot:
 *           type: object
 *           properties:
 *             first_name: { type: string }
 *             last_name: { type: string }
 *             role: { type: string }
 *
 *         manager_snapshot:
 *           type: object
 *           nullable: true
 *           properties:
 *             first_name: { type: string }
 *             last_name: { type: string }
 *             role: { type: string }
 *
 *         service_snapshot:
 *           $ref: '#/components/schemas/ServiceInfo'
 *
 *         additional_services:
 *           type: array
 *           nullable: true
 *           items:
 *             $ref: '#/components/schemas/ServiceInfo'
 *
 *         assignment_date: { type: string, format: date-time }
 *         start_time: { type: string }
 *         end_time: { type: string }
 *
 *         status:
 *           type: string
 *           enum: [new, pending, confirmed, completed, cancelled]
 *
 *         paid:
 *           type: string
 *           enum: [paid, unpaid, refund]
 *
 *         payment_method:
 *           type: object
 *           nullable: true
 *           properties:
 *             methods:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentMethod'
 *             total: { type: number }
 *
 *         discount: { type: number }
 *         final_price: { type: number }
 *         total_duration: { type: integer }
 *         timezone: { type: string }
 *         notes: { type: string, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [cash, card, transfer, gift_certificate, other]
 *         amount: { type: number }
 *         name: { type: string, nullable: true }
 *
 *
 *     CreateAssignmentDto:
 *       type: object
 *       required:
 *         - organizationId
 *         - branchId
 *         - client
 *         - employeeId
 *         - service
 *         - assignmentDate
 *         - startTime
 *       properties:
 *         organizationId: { type: integer }
 *         branchId: { type: integer }
 *
 *         client:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             firstname: { type: string }
 *             phoneNumber: { type: string }
 *
 *         employeeId: { type: integer }
 *         assignmentDate: { type: string, format: date }
 *         startTime: { type: string }
 *         endTime: { type: string, nullable: true }
 *         notes: { type: string }
 *         source: { type: string }
 *         discount: { type: number }
 *         paid:
 *           type: string
 *           enum: [paid, unpaid]
 *         certificateNumber: { type: string }
 *         paymentMethod:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PaymentMethod'
 *         service:
 *           $ref: '#/components/schemas/ServiceInfo'
 *         additionalServices:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ServiceInfo'
 *
 *
 *     UpdateAssignmentDto:
 *       type: object
 *       properties:
 *         service: { $ref: '#/components/schemas/ServiceInfo' }
 *         additionalServices:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ServiceInfo'
 *         assignmentDate: { type: string, format: date }
 *         startTime: { type: string }
 *         endTime: { type: string }
 *         employeeId: { type: integer }
 *         notes: { type: string }
 *         status:
 *           type: string
 *           enum: [new, pending, confirmed, completed, cancelled]
 *         discount: { type: number }
 *         paid:
 *           type: string
 *           enum: [paid, unpaid, refund]
 *         paymentMethod:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PaymentMethod'
 *         certificateNumber: { type: string }
 *
 *
 *     ServiceInfo:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         name: { type: string }
 *         price: { type: number }
 *         duration: { type: integer }
 *
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error: { type: string, example: "Branch not found" }
 */