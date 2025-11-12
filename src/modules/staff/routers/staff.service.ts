import { Router } from "express";
import {
  authorizeRoles,
} from "../../../middleware/authUserMiddleware";
import {
  activateStaff, addBranchToStaff,
  createStaff,
  deleteStaff,
  getListStaff,
  getStaffByBranch, patchStaff, removeBranchFromStaff,
  updateStaff,
} from "../controllers/staff.controller.ts";
import { checkBranchMiddleware, checkOrganizationMiddleware } from "../../../middleware/checkOrganizationMiddleware.ts";

const OrganizationStaffRouter = Router();

OrganizationStaffRouter.get("/",
  authorizeRoles( "owner"),
  getListStaff
);

OrganizationStaffRouter.patch("/:id", checkOrganizationMiddleware, patchStaff);

OrganizationStaffRouter.use(authorizeRoles("manager", "owner"));

OrganizationStaffRouter.get("/byBranch",
  checkOrganizationMiddleware,
  checkBranchMiddleware,
  getStaffByBranch
);
OrganizationStaffRouter.post("/",
  checkOrganizationMiddleware,
  createStaff
);

OrganizationStaffRouter.put("/:id",
  checkOrganizationMiddleware,
  updateStaff
);

OrganizationStaffRouter.delete("/:id",
  checkOrganizationMiddleware,
  deleteStaff
);

OrganizationStaffRouter.patch("/:id/de-activate",
  checkOrganizationMiddleware,
  activateStaff
);

OrganizationStaffRouter.post("/:id/branches",
  checkOrganizationMiddleware,
  addBranchToStaff
);

OrganizationStaffRouter.delete("/:id/branches/:branchId",
  checkOrganizationMiddleware,
  removeBranchFromStaff
);

export default OrganizationStaffRouter;

/**
 * @openapi
 * tags:
 *   name: OrganizationStaff
 *   description: Управление сотрудниками организации
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     OrganizationStaff:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         organization:
 *           type: object
 *           description: Данные об организации, в которой работает сотрудник
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         branches:
 *           type: array
 *           description: Список филиалов сотрудника
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *         username:
 *           type: string
 *           nullable: true
 *         firstname:
 *           type: string
 *         lastname:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [manager, employee]
 *         customRole:
 *           type: string
 *           nullable: true
 *         specialty:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         isActive:
 *           type: boolean
 *         photoUrl:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *   responses:
 *     UnauthorizedError:
 *       description: Нет доступа. Пользователь не авторизован или не имеет прав.
 *     NotFoundError:
 *       description: Запрашиваемый сотрудник не найден.
 *     ValidationError:
 *       description: Ошибка валидации. Одно из обязательных полей отсутствует или неверно.
 *     ConflictError:
 *       description: Конфликт данных. Пользователь с указанным email уже существует.
 */

/**
 * @openapi
 * /staff:
 *   get:
 *     summary: Получить список сотрудников организации
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           enum: [manager, employee]
 *     responses:
 *       200:
 *         description: Успешное получение списка сотрудников
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrganizationStaff'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @openapi
 * /staff/byBranch:
 *   get:
 *     summary: Получить сотрудников по филиалу
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           enum: [manager, employee]
 *     responses:
 *       200:
 *         description: Список сотрудников по филиалу
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       422:
 *         description: Некорректная роль.
 */

/**
 * @openapi
 * /staff:
 *   post:
 *     summary: Создать нового сотрудника
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [organizationId, firstname, lastname, password, email]
 *             properties:
 *               organizationId:
 *                 type: number
 *               branches:
 *                 type: array
 *                 items:
 *                   type: number
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [manager, employee]
 *               customRole:
 *                 type: string
 *               specialty:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               photoUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Сотрудник успешно создан
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */

/**
 * @openapi
 * /staff/{id}:
 *   put:
 *     summary: Полное обновление данных сотрудника
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrganizationStaff'
 *     responses:
 *       200:
 *         description: Сотрудник обновлён
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @openapi
 * /staff/{id}:
 *   patch:
 *     summary: Частичное обновление данных сотрудника (доступно менеджеру или самому пользователю)
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Сотрудник обновлён
 *       403:
 *         description: Недостаточно прав для изменения данных
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */

/**
 * @openapi
 * /staff/{id}:
 *   delete:
 *     summary: Удалить сотрудника (только для менеджера или владельца)
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Сотрудник удалён
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @openapi
 * /staff/{id}/de-activate:
 *   patch:
 *     summary: Активировать или деактивировать сотрудника
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Статус активности сотрудника изменён
 */

/**
 * @openapi
 * /staff/{id}/branches:
 *   post:
 *     summary: Добавить сотрудника к филиалу
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branchId]
 *             properties:
 *               branchId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Сотрудник успешно добавлен в филиал
 *       400:
 *         description: branchId отсутствует или некорректен
 *       404:
 *         description: Сотрудник или филиал не найден
 */

/**
 * @openapi
 * /staff/{id}/branches/{branchId}:
 *   delete:
 *     summary: Удалить сотрудника из филиала
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *       - in: path
 *         name: branchId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Филиал успешно удалён у сотрудника
 *       400:
 *         description: Нельзя удалить последний филиал
 *       404:
 *         description: Сотрудник или филиал не найден
 */
