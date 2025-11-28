import { Router } from "express";
import {
  authorizeRoles,
} from "../../../middleware/authorization/authUserMiddleware.ts";
import {
  activateStaff, addBranchToStaff,
  createStaff,
  deleteStaff,
  getListStaff,
  getStaffByBranch,
  removeBranchFromStaff,
  updateMyProfile,
  updateStaff,
} from "../controllers/staff.controller.ts";
import { checkBranchMiddleware, checkOrganizationMiddleware } from "../../../middleware/authorization/checkOrganizationMiddleware.ts";

const OrganizationStaffRouter = Router();

OrganizationStaffRouter.get("/",
  authorizeRoles( "owner"),
  getListStaff
);

OrganizationStaffRouter.get("/byBranch",
  checkOrganizationMiddleware, checkBranchMiddleware, authorizeRoles("manager", "owner"),
  getStaffByBranch
);

OrganizationStaffRouter.post("/",
  checkOrganizationMiddleware, authorizeRoles( "owner"),
  createStaff
);

OrganizationStaffRouter.patch("/:id",
  checkOrganizationMiddleware, authorizeRoles( "owner"),
  updateStaff
);

OrganizationStaffRouter.patch("/me/:id",
  checkOrganizationMiddleware,
  updateMyProfile
);

OrganizationStaffRouter.delete("/:id",
  checkOrganizationMiddleware, authorizeRoles( "owner"),
  deleteStaff
);

OrganizationStaffRouter.patch("/:id/de-activate",
  checkOrganizationMiddleware, authorizeRoles( "owner"),
  activateStaff
);

OrganizationStaffRouter.post("/:id/branches",
  checkOrganizationMiddleware, authorizeRoles( "owner"),
  addBranchToStaff
);

OrganizationStaffRouter.delete("/:id/branches/:branchId",
  checkOrganizationMiddleware, authorizeRoles( "owner"),
  removeBranchFromStaff
);

export default OrganizationStaffRouter;

/**
 * @openapi
 * tags:
 *   name: OrganizationStaff
 *   description: Управление сотрудниками организации. Либо в body, либо в query organizationId обязателен во всех роутах
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
 *         first_name:
 *           type: string
 *         last_name:
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
 *         is_active:
 *           type: boolean
 *         photo_url:
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
 *     summary: Получить список сотрудников организации. Только владелец (owner)
 *     description: organizationId или branchId обязателен (хотя бы один из них). Поддерживает пагинацию.
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID организации
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           enum: [manager, employee]
 *         description: Роль сотрудника для фильтрации
 *       - in: query
 *         name: branchId
 *         required: false
 *         schema:
 *           type: string
 *         description: ID филиала для фильтрации
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Количество элементов на странице
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
 *                     $ref: '#/components/schemas/OrganizationStaff'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       422:
 *         description: Некорректная роль.
 */

/**
 * @openapi
 * /staff/byBranch:
 *   get:
 *     summary: Получить сотрудников по филиалу. Только владелец (owner) и менеджер (manager)
 *     description: Поддерживает пагинацию.
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID организации
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID филиала
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           enum: [manager, employee]
 *         description: Роль сотрудника для фильтрации
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Количество элементов на странице
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
 *                     $ref: '#/components/schemas/OrganizationStaff'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       422:
 *         description: Некорректная роль.
 */

/**
 * @openapi
 * /staff:
 *   post:
 *     summary: Создать нового сотрудника. Только владелец (owner)
 *     tags: [OrganizationStaff]
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
 *               - firstname
 *               - lastname
 *             properties:
 *               organizationId:
 *                 type: number
 *                 description: ID организации
 *               branches:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     name:
 *                       type: string
 *                     address:
 *                       type: string
 *                 description: Массив филиалов
 *                 example: [{"id": 1, "name": "Elitaroma", "address": "Kulatova 55"}]
 *               firstname:
 *                 type: string
 *                 description: Имя сотрудника
 *               lastname:
 *                 type: string
 *                 description: Фамилия сотрудника
 *               username:
 *                 type: string
 *                 description: Имя пользователя (опционально)
 *               email:
 *                 type: string
 *                 description: Email
 *               password:
 *                 type: string
 *                 description: Пароль
 *               role:
 *                 type: string
 *                 enum: [manager, employee]
 *                 default: employee
 *                 description: Роль сотрудника
 *               customRole:
 *                 type: string
 *                 description: Пользовательская роль
 *               specialty:
 *                 type: string
 *                 description: Специальность
 *               description:
 *                 type: string
 *                 description: Описание
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Статус активности
 *               photo:
 *                 type: string
 *                 description: URL фото сотрудника
 *
 *     responses:
 *       201:
 *         description: Сотрудник успешно создан
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
 *
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 *       422:
 *         description: Некорректная роль.
 */

/**
 * @openapi
 * /staff/{id}:
 *   patch:
 *     summary: Обновить данные сотрудника. Только владелец (owner)
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID сотрудника
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organizationId:
 *                 type: number
 *                 description: ID организации
 *               branches:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     name:
 *                       type: string
 *                     address:
 *                       type: string
 *                 description: Массив филиалов
 *               firstname:
 *                 type: string
 *                 description: Имя
 *               lastname:
 *                 type: string
 *                 description: Фамилия
 *               username:
 *                 type: string
 *                 description: Имя пользователя
 *               email:
 *                 type: string
 *                 description: Email
 *               password:
 *                 type: string
 *                 description: Новый пароль
 *               role:
 *                 type: string
 *                 enum: [manager, employee]
 *                 description: Роль
 *               customRole:
 *                 type: string
 *                 description: Пользовательская роль
 *               specialty:
 *                 type: string
 *                 description: Специальность
 *               description:
 *                 type: string
 *                 description: Описание
 *               photo:
 *                 type: string
 *                 description: URL фото
 *     responses:
 *       200:
 *         description: Сотрудник успешно обновлён
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
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 *       422:
 *         description: Некорректная роль.
 */

/**
 * @openapi
 * /staff/me/{id}:
 *   patch:
 *     summary: Обновление профиля сотрудника (только сам сотрудник может менять свои данные)
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID сотрудника
 *
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *                 description: Имя
 *               lastname:
 *                 type: string
 *                 description: Фамилия
 *               username:
 *                 type: string
 *                 description: Имя пользователя
 *               email:
 *                 type: string
 *                 description: Email
 *               password:
 *                 type: string
 *                 description: Новый пароль
 *               description:
 *                 type: string
 *                 description: Описание
 *               specialty:
 *                 type: string
 *                 description: Специальность
 *               photo:
 *                 type: string
 *                 description: URL фото
 *
 *     responses:
 *       200:
 *         description: Профиль успешно обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/OrganizationStaff'
 *
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @openapi
 * /staff/{id}:
 *   delete:
 *     summary: Удалить сотрудника. Только владелец (owner)
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID сотрудника
 *     responses:
 *       200:
 *         description: Сотрудник успешно удалён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @openapi
 * /staff/{id}/de-activate:
 *   patch:
 *     summary: Активировать или деактивировать сотрудника. Только владелец (owner)
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID сотрудника
 *     responses:
 *       200:
 *         description: Статус активности сотрудника изменён
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
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @openapi
 * /staff/{id}/branches:
 *   post:
 *     summary: Добавить сотрудника к филиалу. Только владелец (owner)
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID сотрудника
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branchId]
 *             properties:
 *               branchId:
 *                 type: integer
 *                 description: ID филиала
 *     responses:
 *       200:
 *         description: Сотрудник успешно добавлен в филиал
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
 *       400:
 *         description: branchId отсутствует или сотрудник уже назначен на этот филиал
 *       404:
 *         description: Сотрудник или филиал не найден
 */

/**
 * @openapi
 * /staff/{id}/branches/{branchId}:
 *   delete:
 *     summary: Удалить сотрудника из филиала. Только владелец (owner)
 *     tags: [OrganizationStaff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID сотрудника
 *       - in: path
 *         name: branchId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID филиала
 *     responses:
 *       200:
 *         description: Филиал успешно удалён у сотрудника
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
 *       400:
 *         description: Нельзя удалить последний филиал или некорректный branchId
 *       404:
 *         description: Сотрудник не найден или филиал не найден в списке филиалов сотрудника
 */