import express from "express";
import {
  createBranch,
  deactivateBranch,
  getBranchById,
  getBranches,
  updateBranch,
} from "../controllers/branch.controllers.ts";
import { authenticateToken, authorizeRoles } from "../../../middleware/authUserMiddleware.ts";

const BranchServiceRoute = express.Router();

BranchServiceRoute.use(authenticateToken, authorizeRoles("owner"));

BranchServiceRoute.get("/", getBranches);
BranchServiceRoute.get("/:id", getBranchById);
BranchServiceRoute.post("/", createBranch);
BranchServiceRoute.patch("/:id", updateBranch);
BranchServiceRoute.patch("/:id/deactivate", deactivateBranch);

export default BranchServiceRoute;

/**
 * @openapi
 * /branches:
 *   get:
 *     summary: Получить список филиалов
 *     tags:
 *       - Branch
 *     parameters:
 *       - in: query
 *         name: owner
 *         schema:
 *           type: integer
 *         description: ID владельца для фильтрации
 *     responses:
 *       200:
 *         description: Список филиалов
 *         content:
 *           application/json:
 *             example:
 *               - id: 1
 *                 organization_id: 2
 *                 name: "Main Office"
 *                 phone: "+123456789"
 *                 address: "ул. Ленина, 1"
 *                 timezone: "Asia/Bishkek"
 *               - id: 2
 *                 organization_id: 2
 *                 name: "Branch 2"
 *                 phone: "+987654321"
 *                 address: "ул. Советская, 5"
 *                 timezone: "Asia/Bishkek"
 */

/**
 * @openapi
 * /branches/{id}:
 *   get:
 *     summary: Получить филиал по ID
 *     tags:
 *       - Branch
 *     parameters:
 *       - in: path
 *         name: id
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
 *               phone: "+123456789"
 *               address: "ул. Ленина, 1"
 *               timezone: "Asia/Bishkek"
 *       404:
 *         description: Branch not found
 */

/**
 * @openapi
 * /branches:
 *   post:
 *     summary: Создать филиал
 *     tags:
 *       - Branch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             organizationId: 2
 *             name: "New Branch"
 *             phone: "+777777777"
 *             address: "ул. Победы, 10"
 *             timezone: "Asia/Bishkek"
 *     responses:
 *       200:
 *         description: Branch created
 *         content:
 *           application/json:
 *             example:
 *               message: "Branch created successfully."
 *               newBranch:
 *                 id: 3
 *                 organization_id: 2
 *                 name: "New Branch"
 *                 phone: "+777777777"
 *                 address: "ул. Победы, 10"
 *                 timezone: "Asia/Bishkek"
 *       400:
 *         description: Ошибка валидации
 */

/**
 * @openapi
 * /branches/{id}:
 *   patch:
 *     summary: Обновить филиал
 *     tags:
 *       - Branch
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: "Updated Branch"
 *             phone: "+111111111"
 *             address: "ул. Гагарина, 25"
 *             timezone: "Asia/Bishkek"
 *     responses:
 *       200:
 *         description: Branch обновлён
 *         content:
 *           application/json:
 *             example:
 *               message: "Branch updated successfully"
 *               branch:
 *                 id: 1
 *                 organization_id: 2
 *                 name: "Updated Branch"
 *                 phone: "+111111111"
 *                 address: "ул. Гагарина, 25"
 *                 timezone: "Asia/Bishkek"
 *       404:
 *         description: Branch not found
 */

/**
 * @openapi
 * /branches/{id}/deactivate:
 *   patch:
 *     summary: Деактивировать филиал
 *     tags:
 *       - Branch
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала
 *     responses:
 *       200:
 *         description: Филиал деактивирован
 *         content:
 *           application/json:
 *             example:
 *               message: "You have deactivated the branch: Main Office"
 *       404:
 *         description: Branch not found
 *       401:
 *         description: Permission denied
 */
