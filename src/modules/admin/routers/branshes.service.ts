import express from "express";
import {
  createBranch,
  getBranchById,
  getBranches,
  updateBranch,
} from "../../organization/controllers/branch.controllers.ts";

const AdminBranchesService = express.Router();

AdminBranchesService.get("/", getBranches);
AdminBranchesService.get("/:id", getBranchById);
AdminBranchesService.post("/", createBranch);
AdminBranchesService.patch("/:id", updateBranch);

/**
 * @openapi
 * tags:
 *   - name: Admin Branch
 *     description: Управление филиалами организации
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Branch:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         organization_id:
 *           type: integer
 *           example: 2
 *         name:
 *           type: string
 *           example: "Main Office"
 *         phone:
 *           type: string
 *           example: "+996700000001"
 *         address:
 *           type: string
 *           example: "ул. Ленина, 1"
 *         timezone:
 *           type: string
 *           example: "Asia/Bishkek"
 *         isActive:
 *           type: boolean
 *           example: true
 */

/**
 * @openapi
 * /admin/branches:
 *   get:
 *     summary: Получить список филиалов организации
 *     tags:
 *       - Admin Branch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *         description: ID организации
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
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Branch"
 *       401:
 *         description: Не авторизован — требуется токен
 *       403:
 *         description: Доступ запрещён — роль не имеет прав
 */

/**
 * @openapi
 * /admin/branches/{branchId}:
 *   get:
 *     summary: Получить информацию о филиале по ID
 *     tags:
 *       - Admin Branch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Филиал найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Branch"
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Филиал не найден
 */

/**
 * @openapi
 * /admin/branches:
 *   post:
 *     summary: Создать новый филиал
 *     tags:
 *       - Admin Branch
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [organizationId, name, phone, address, timezone]
 *             properties:
 *               organizationId:
 *                 type: integer
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               timezone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Филиал успешно создан
 *         content:
 *           application/json:
 *             example:
 *               message: "Branch created successfully."
 *               newBranch:
 *                 id: 3
 *                 organization_id: 2
 *                 name: "New Branch"
 *                 phone: "+996700000003"
 *                 address: "ул. Победы, 10"
 *                 timezone: "Asia/Bishkek"
 *                 isActive: true
 *       400:
 *         description: Ошибка валидации или превышен лимит филиалов
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Только владелец может создавать филиалы
 */

/**
 * @openapi
 * /admin/branches/{branchId}:
 *   patch:
 *     summary: Обновить информацию о филиале
 *     description: Только владельцы (owner) могут обновлять филиалы.
 *     tags:
 *       - Admin Branch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Филиал успешно обновлён
 *         content:
 *           application/json:
 *             example:
 *               message: "Branch updated successfully."
 *               branch:
 *                 id: 1
 *                 organization_id: 2
 *                 name: "Updated Branch"
 *                 phone: "+996700000004"
 *                 address: "ул. Гагарина, 25"
 *                 timezone: "Asia/Bishkek"
 *                 isActive: false
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Филиал не найден
 */

export default AdminBranchesService;