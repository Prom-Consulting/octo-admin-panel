import express from "express";
import {
  createBranch,
  deactivateBranch,
  getBranchById,
  getBranches, getBranchWithOrganization,
  updateBranch,
} from "../../controllers/branch.controllers.ts";
import { authenticateToken, authorizeRoles } from "../../../../middleware/authorization/authUserMiddleware.ts";
import { checkBranchMiddleware, checkOrganizationMiddleware } from "../../../../middleware/authorization/checkOrganizationMiddleware.ts";

const BranchServiceRoute = express.Router();

BranchServiceRoute.use(authenticateToken); //middleware

BranchServiceRoute.get("/",
  authorizeRoles("owner", "manager"), checkOrganizationMiddleware, //middleware
  getBranches                         // route
);

BranchServiceRoute.get("/:branchId",
  authorizeRoles("owner", "manager"),
  checkBranchMiddleware,
  getBranchById
);

BranchServiceRoute.post("/",
  authorizeRoles("owner"),
  createBranch
);

BranchServiceRoute.patch("/:branchId",
  authorizeRoles("owner"), checkBranchMiddleware,
  updateBranch
);

BranchServiceRoute.patch("/:branchId/deactivate",
  authorizeRoles("owner"), checkBranchMiddleware,
  deactivateBranch
);

BranchServiceRoute.get("/organization/:branchId",
  checkBranchMiddleware,
  getBranchWithOrganization,
  );

export default BranchServiceRoute;

/**
 * @openapi
 * tags:
 *   - name: Branch
 *     description: Управление филиалами организации (только для владельцев и менеджеров)
 */

/**
 * @openapi
 * /branches:
 *   get:
 *     summary: Получить список филиалов организации
 *     tags: [Branch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *         description: ID организации (для фильтрации, обязательно для owner)
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
 * /branches/{branchId}:
 *   get:
 *     summary: Получить информацию о филиале по ID
 *     tags: [Branch]
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

/**
 * @openapi
 * /branches:
 *   post:
 *     summary: Создать новый филиал. Только для владельцев (owner)
 *     tags: [Branch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *               - name
 *               - phone
 *               - address
 *               - timezone
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
 *           example:
 *             organizationId: 2
 *             name: "New Branch"
 *             phone: "+996700000003"
 *             address: "ул. Победы, 10"
 *             timezone: "Asia/Bishkek"
 *     responses:
 *       200:
 *         description: Филиал успешно создан (только владелец)
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
 *       400:
 *         description: Ошибка валидации или превышен лимит филиалов
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Только владелец может создавать филиалы
 */

/**
 * @openapi
 * /branches/{branchId}:
 *   patch:
 *     summary: Обновить информацию о филиале. Только для владельцев (owner)
 *     tags: [Branch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала
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
 *           example:
 *             name: "Updated Branch"
 *             phone: "+996700000004"
 *             address: "ул. Гагарина, 25"
 *             isActive: false
 *     responses:
 *       200:
 *         description: Филиал успешно обновлён
 *         content:
 *           application/json:
 *             example:
 *               message: "Branch updated successfully"
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
 *         description: Недостаточно прав (например, менеджеры не могут изменять филиалы)
 *       404:
 *         description: Филиал не найден
 */

/**
 * @openapi
 * /branches/{branchId}/deactivate:
 *   patch:
 *     summary: Деактивировать филиал. Только для владельцев (owner)
 *     tags: [Branch]
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
 *         description: Филиал успешно деактивирован
 *         content:
 *           application/json:
 *             example:
 *               message: "You have deactivated the branch: Main Office"
 *       400:
 *         description: Филиал уже деактивирован
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Доступ запрещён (только владелец)
 *       404:
 *         description: Филиал не найден
 */
