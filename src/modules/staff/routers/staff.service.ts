import { Router } from "express";
import {
  authorizeRoles,
  checkOrganizationAccess,
} from "../../../middleware/authUserMiddleware";
import {
  activateStaff, addBranchToStaff,
  createStaff,
  deleteStaff,
  getListStaff,
  getStaffByBranch, patchStaff, removeBranchFromStaff,
  updateStaff,
} from "../controllers/staff.controller.ts";

const OrganizationStaffRouter = Router();

OrganizationStaffRouter.get("/", authorizeRoles( "owner"), checkOrganizationAccess, getListStaff);
OrganizationStaffRouter.patch("/:id", patchStaff);


OrganizationStaffRouter.use(authorizeRoles("manager", "owner"));

OrganizationStaffRouter.get("/byBranch", checkOrganizationAccess, getStaffByBranch);
OrganizationStaffRouter.post("/", createStaff);
OrganizationStaffRouter.put("/:id", updateStaff);
OrganizationStaffRouter.delete("/:id", deleteStaff);
OrganizationStaffRouter.patch("/:id/de-activate", activateStaff);
OrganizationStaffRouter.post("/:id/branches", addBranchToStaff);
OrganizationStaffRouter.delete("/:id/branches/:branchId", removeBranchFromStaff);

export default OrganizationStaffRouter;

/**
 * @swagger
 * tags:
 *   name: OrganizationStaff
 *   description: Управление сотрудниками организации
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OrganizationStaff:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         organization:
 *           type: object
 *           description: Сведения об организации сотрудника
 *         branches:
 *           type: array
 *           description: Массив филиалов сотрудника
 *           items:
 *             type: object
 *             description: Сведения о филиале
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
 */

/**
 * @swagger
 * /staff:
 *   get:
 *     summary: Получить список сотрудников организации
 *     tags: [OrganizationStaff]
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
 *         description: Список сотрудников
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
 */

/**
 * @swagger
 * /staff/byBranch:
 *   get:
 *     summary: Получить сотрудников по филиалу
 *     tags: [OrganizationStaff]
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
 */

/**
 * @swagger
 * /staff:
 *   post:
 *     summary: Создать нового сотрудника
 *     tags: [OrganizationStaff]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *         description: Сотрудник создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/OrganizationStaff'
 */

/**
 * @swagger
 * /staff/{id}:
 *   put:
 *     summary: Обновить сотрудника полностью
 *     tags: [OrganizationStaff]
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
 *         description: Сотрудник обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/OrganizationStaff'
 */

/**
 * @swagger
 * /staff/{id}:
 *   patch:
 *     summary: Частичное обновление сотрудника
 *     tags: [OrganizationStaff]
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
 *             type: object
 *     responses:
 *       200:
 *         description: Сотрудник обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/OrganizationStaff'
 */

/**
 * @swagger
 * /staff/{id}:
 *   delete:
 *     summary: Удалить сотрудника
 *     tags: [OrganizationStaff]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Сотрудник удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /staff/{id}/de-activate:
 *   patch:
 *     summary: Активировать или деактивировать сотрудника
 *     tags: [OrganizationStaff]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Сотрудник активирован/деактивирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/OrganizationStaff'
 */

/**
 * @swagger
 * /staff/{id}/branches:
 *   post:
 *     summary: Добавить сотрудника к филиалу
 *     tags: [OrganizationStaff]
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
 *             type: object
 *             properties:
 *               branchId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Филиал добавлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/OrganizationStaff'
 */

/**
 * @swagger
 * /staff/{id}/branches/{branchId}:
 *   delete:
 *     summary: Удалить сотрудника из филиала
 *     tags: [OrganizationStaff]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Филиал удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/OrganizationStaff'
 */
