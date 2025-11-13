import express from "express";
import { authAdminMiddleware } from "../../../middleware/authAdminMiddleware.ts";
import {
  createOrganization, editOrganization,
  getListOrganizations,
  getOrganizationByID,
} from "../../organization/controllers/organization.controller.ts";

const AdminOrganizations = express.Router();

AdminOrganizations.use(authAdminMiddleware);

AdminOrganizations.get("/",  getListOrganizations);
AdminOrganizations.get("/:id", getOrganizationByID);
AdminOrganizations.post("/", createOrganization);
AdminOrganizations.patch("/:id", editOrganization);

/**
 * @swagger
 * tags:
 *   - name: AdminOrganizations
 *     description: Управление организациями (только для админов). Удалять организацию нельзя
 */

/**
 * @swagger
 * /admin/organizations:
 *   get:
 *     summary: Получить список организаций
 *     description: |
 *       Возвращает список организаций в зависимости от роли пользователя:
 *       - **admin**: может видеть все организации или фильтровать по `ownerId`.
 *       - **owner**: видит только свои организации.
 *       - **другие роли**: видят только активные организации.
 *     tags: [AdminOrganizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: integer
 *         required: false
 *         description: ID владельца (используется только админом для фильтрации)
 *     responses:
 *       200:
 *         description: Успешно. Список организаций получен.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Пользователь не авторизован.
 *         content:
 *           application/json:
 *             example:
 *               error: "Not authorized"
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

/**
 * @swagger
 * /admin/organizations/{organizationId}:
 *   get:
 *     summary: Получить информацию об организации по ID
 *     description: |
 *       Возвращает данные организации по её ID.
 *       Доступ зависит от роли:
 *       - **admin**: может просматривать любую.
 *       - **owner**: только свои.
 *       - **остальные**: только активные.
 *     tags: [AdminOrganizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID организации
 *     responses:
 *       200:
 *         description: Успешно. Возвращает объект организации.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Пользователь не авторизован.
 *         content:
 *           application/json:
 *             example:
 *               error: "Not authorized"
 *       403:
 *         description: Доступ запрещён (организация не активна или не принадлежит пользователю).
 *         content:
 *           application/json:
 *             example:
 *               error: "Access denied"
 *       404:
 *         description: Организация не найдена.
 *         content:
 *           application/json:
 *             example:
 *               error: "Organization not found"
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

/**
 * @swagger
 * /admin/organizations:
 *   post:
 *     summary: Создать новую организацию. Вместе с ней создается и база данных для этой организации.
 *     description: |
 *       Создаёт новую организацию, связанную с существующим пользователем.
 *       Проверяет наличие пользователя и уникальность имени организации.
 *       Создает базу данных на бэке Octo Api
 *     tags: [AdminOrganizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - branches
 *               - paidDate
 *               - userId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "ElitaRoma"
 *               branches:
 *                 type: integer
 *                 example: 3
 *               paidDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-10T10:00:00.000Z"
 *               userId:
 *                 type: integer
 *                 example: 15
 *     responses:
 *       201:
 *         description: Организация успешно создана.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 newOrganization:
 *                   $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Ошибка валидации или конфликт данных.
 *         content:
 *           application/json:
 *             examples:
 *               missingFields:
 *                 summary: Отсутствуют обязательные поля
 *                 value:
 *                   error: "Inputs required"
 *               duplicate:
 *                 summary: Организация уже существует
 *                 value:
 *                   error: "Organization already exists"
 *               userNotFound:
 *                 summary: Пользователь не найден
 *                 value:
 *                   error: "The user does not exist"
 *       500:
 *         description: Ошибка при создании базы данных.
 *         content:
 *           application/json:
 *             example:
 *               error: "Database issue"
 */



export default AdminOrganizations;