import express from "express";
import { getListOrganizations, getOrganizationByID } from "../../organization/controllers/organization.controller.ts";

const BookingOrganizationRoute = express.Router();

BookingOrganizationRoute.get("/", getListOrganizations);
BookingOrganizationRoute.get("/:id", getOrganizationByID);

/**
 * @swagger
 * tags:
 *   name: Booking Organizations
 *   description: Список организаций. Общий роут для всех клиентов
 */

/**
 * @swagger
 * /booking/organizations/:
 *   get:
 *     summary: Получить список организаций.
 *     tags: [Booking Organizations]
 *     parameters:
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: integer
 *         description: ID владельца организации
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Поиск организаций по частичному совпадению имени
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
 */

/**
 * @swagger
 * /booking/organizations/{id}:
 *   get:
 *     summary: Получить организацию по ID
 *     tags: [Booking Organizations]
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

export default BookingOrganizationRoute;