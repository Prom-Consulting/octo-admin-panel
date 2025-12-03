import express from "express";
import { getClientById, getClients, updateActiveClient } from "../../../client/controllers/clietn.controller.ts";

const OrganizationClientRouter = express.Router();

OrganizationClientRouter.get("/", getClients);
OrganizationClientRouter.get("/:id", getClientById);
OrganizationClientRouter.patch("/:id", updateActiveClient);

/**
 * @openapi
 * tags:
 *   - name: Clients list
 *     description: Управление клиентами (для владельца и сотрудников)
 */

/**
 * @openapi
 * /organizations/clients:
 *   get:
 *     summary: Получить список всех клиентов
 *     description: >
 *       Эндпоинт возвращает список клиентов с фильтрацией, пагинацией и информацией об активности.
 *       Защищён админским токеном.
 *     tags:
 *       - Clients list
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: firstname
 *         schema:
 *           type: string
 *         description: Фильтр по имени (частичное совпадение)
 *       - in: query
 *         name: lastname
 *         schema:
 *           type: string
 *         description: Фильтр по фамилии
 *       - in: query
 *         name: phoneNumber
 *         schema:
 *           type: string
 *         description: Фильтр по номеру телефона
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Фильтр по активности клиента
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Номер страницы (по умолчанию 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Количество записей на странице (по умолчанию 20)
 *     responses:
 *       200:
 *         description: Список клиентов успешно получен
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
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/ClientAdmin"
 *       401:
 *         description: Не авторизован или токен недействителен
 */

/**
 * @openapi
 * /organizations/clients/{id}:
 *   get:
 *     summary: Получить информацию о клиенте по ID
 *     description: >
 *       Возвращает базовую информацию о клиенте без номера телефона и без конфиденциальных полей.
 *     tags:
 *       - Clients list
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Клиент найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ClientAdminDetail"
 *       404:
 *         description: Клиент не найден
 *       401:
 *         description: Не авторизован
 */

/**
 * @openapi
 * /organizations/clients/{id}:
 *   patch:
 *     summary: Активировать или деактивировать клиента
 *     description: >
 *       Эндпоинт переключает статус активности клиента (`is_active`).
 *       Если клиент активен — он станет неактивным, и наоборот.
 *     tags:
 *       - Clients list
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID клиента
 *     responses:
 *       200:
 *         description: Статус клиента успешно изменён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Client deactivated
 *       404:
 *         description: Клиент не найден
 *       401:
 *         description: Не авторизован или токен недействителен
 */

export default OrganizationClientRouter;