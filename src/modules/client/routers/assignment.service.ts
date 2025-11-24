import express from "express";
import {
  createAssignment, editAssignmentBasic,
  getAssignmentById,
  getListAssignments,
} from "../../assignments/controllers/assignment.controller.ts";

const ClientAssigmentRoute = express.Router();

ClientAssigmentRoute.get("/", getListAssignments);
ClientAssigmentRoute.get("/:id", getAssignmentById);
ClientAssigmentRoute.post("/", createAssignment);
ClientAssigmentRoute.patch("/:id", editAssignmentBasic);

/**
 * @swagger
 * tags:
 *   name: Client Assignments
 *   description: Управление клиентскими записями для авторизированного клиента.
 */

/**
 * @swagger
 * /clients/assignments:
 *   get:
 *     summary: Получить список назначений. Клиент увидеть лишь свои может только свои
 *     description: Возвращает список назначений (записей клиентов) для выбранного филиала.
 *       Можно фильтровать по дате, сотруднику и клиенту
 *     tags: [Client Assignments]
 *     security:
 *       - bearerAuth: []
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
 * /clients/assignments/{id}:
 *   get:
 *     summary: Получить данные конкретного назначения. Клиент увидеть лишь свои может только свои
 *     description: Возвращает полные данные по конкретному назначению (записи клиента).
 *     tags: [Client Assignments]
 *     security:
 *       - bearerAuth: []
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
 * /clients/assignments:
 *   post:
 *     summary: Создать новое назначение. Сотрудник может только свои
 *     description: Создаёт новую запись клиента к сотруднику. Проверяется наличие организации, филиала, клиента и сотрудника. В случае конфликта времени возвращает ошибку.
 *     tags: [Client Assignments]
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


export default ClientAssigmentRoute;