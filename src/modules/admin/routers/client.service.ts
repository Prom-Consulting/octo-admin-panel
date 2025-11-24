import express from "express";
import { getClientById, getClients, updateActiveClient } from "../../client/controllers/clietn.controller.ts";

const AdminClientRouter = express.Router();

AdminClientRouter.get("/", getClients);
AdminClientRouter.get("/:id", getClientById);
AdminClientRouter.patch("/:id", updateActiveClient);

/**
 * @openapi
 * tags:
 *   - name: Admin Clients
 *     description: Управление клиентами (для администраторов)
 */

/**
 * @openapi
 * /admin/clients:
 *   get:
 *     summary: Получить список всех клиентов (админ)
 *     description: >
 *       Эндпоинт возвращает список клиентов с фильтрацией, пагинацией и информацией об активности.
 *       Защищён админским токеном.
 *     tags:
 *       - Admin Clients
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
 * /admin/clients/{id}:
 *   get:
 *     summary: Получить информацию о клиенте по ID (админ)
 *     description: >
 *       Возвращает базовую информацию о клиенте без номера телефона и без конфиденциальных полей.
 *     tags:
 *       - Admin Clients
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
 * components:
 *   schemas:
 *     ClientAdmin:
 *       type: object
 *       description: Клиент в списке (для админ-панели)
 *       properties:
 *         id:
 *           type: string
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *           nullable: true
 *         custom_name:
 *           type: string
 *           nullable: true
 *         phone_number:
 *           type: string
 *         is_active:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     ClientAdminDetail:
 *       type: object
 *       description: Детальная информация о клиенте (для админа)
 *       properties:
 *         id:
 *           type: string
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *           nullable: true
 *         custom_name:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /admin/clients/{id}:
 *   patch:
 *     summary: Активировать или деактивировать клиента
 *     description: >
 *       Эндпоинт переключает статус активности клиента (`is_active`).
 *       Если клиент активен — он станет неактивным, и наоборот.
 *     tags:
 *       - Admin Clients
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


export default AdminClientRouter;