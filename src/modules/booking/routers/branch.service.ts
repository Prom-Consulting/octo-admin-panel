import express from "express";
import { getBranchById, getBranches } from "../../organization/controllers/branch.controllers.ts";

const BookingBranchRoute = express.Router();

BookingBranchRoute.get("/", getBranches);
BookingBranchRoute.get("/:id", getBranchById);

/**
 * @openapi
 * tags:
 *   - name: Booking Branch
 *     description: Управление филиалами организации (только для владельцев и менеджеров)
 */

/**
 * @openapi
 * /booking/branches:
 *   get:
 *     summary: Получить список филиалов организации
 *     tags: [Booking Branch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *         description: ID организации (для фильтрации, обязательно для admin)
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Поиск филиалов по частичному совпадению имени
 *     responses:
 *       200:
 *         description: Список филиалов успешно получен
 *         content:
 *           application/json:
 *             example:
 *               - id: 1
 *                 organization_id: 2
 *                 name: "Main Office"
 *                 phone: "+996700000001"
 *                 address: "ул. Ленина, 1"
 *                 timezone: "Asia/Bishkek"
 *                 isActive: true
 *               - id: 2
 *                 organization_id: 2
 *                 name: "Branch 2"
 *                 phone: "+996700000002"
 *                 address: "ул. Советская, 5"
 *                 timezone: "Asia/Bishkek"
 *                 isActive: true
 *       401:
 *         description: Не авторизован — требуется токен
 *       403:
 *         description: Доступ запрещён — роль не имеет прав
 */

/**
 * @openapi
 * /booking/branches/{branchId}:
 *   get:
 *     summary: Получить информацию о филиале по ID
 *     tags: [Booking Branch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала
 *     responses:
 *       200:
 *         description: Филиал найден
 *         content:
 *           application/json:
 *             example:
 *               id: 1
 *               organization_id: 2
 *               name: "Main Office"
 *               phone: "+996700000001"
 *               address: "ул. Ленина, 1"
 *               timezone: "Asia/Bishkek"
 *               isActive: true
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Доступ запрещён (например, сотрудник не привязан к филиалу)
 *       404:
 *         description: Филиал не найден
 */

export default BookingBranchRoute;