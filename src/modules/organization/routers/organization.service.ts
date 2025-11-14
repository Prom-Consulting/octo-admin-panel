import express from "express";
import { getListOrganizations, getOrganizationByID } from "../controllers/organization.controller.ts";
import { authenticateToken, authorizeRoles } from "../../../middleware/authUserMiddleware.ts";
import { checkOrganizationMiddleware } from "../../../middleware/checkOrganizationMiddleware.ts";

const OrganizationServiceRoute = express.Router();
OrganizationServiceRoute.use(
  authenticateToken,
  authorizeRoles("owner"),
);

OrganizationServiceRoute.get("/", getListOrganizations);
OrganizationServiceRoute.get("/:organizationId", checkOrganizationMiddleware, getOrganizationByID);

export default OrganizationServiceRoute;

/**
 * @swagger
 * tags:
 *   name: Organizations
 *   description: Работа с организациями. Только для владельца (owner). Владелец может взаимодействовать лишь свои организации
 */

/**
 * @swagger
 * /organizations/:
 *   get:
 *     summary: Получить список организаций.
 *     tags: [Organizations]
 *     parameters:
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: integer
 *         description: ID владельца организации
 *     responses:
 *       200:
 *         description: Список организаций
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Organization'
 *
 *   post:
 *     summary: Создать новую организацию
 *     tags: [Organizations]
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
 *               branches:
 *                 type: integer
 *               paidDate:
 *                 type: string
 *                 format: date
 *               userId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Организация успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 newOrganization:
 *                   $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Ошибка валидации
 *       500:
 *         description: Проблема с базой данных
 */

/**
 * @swagger
 * /organizations/{id}:
 *   get:
 *     summary: Получить организацию по ID
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Информация об организации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organization'
 *       404:
 *         description: Организация не найдена
 *
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Organization:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         user_id:
 *           type: integer
 *         branches:
 *           type: integer
 *         paidDate:
 *           type: string
 *           format: date
 *         isActive:
 *           type: boolean
 */
