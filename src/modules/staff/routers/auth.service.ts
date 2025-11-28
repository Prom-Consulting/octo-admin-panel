import { Router } from "express";
import { authenticateToken } from "../../../middleware/authorization/authUserMiddleware.ts";
import { staffLogout, staffLogin, staffRefreshToken, staffMe, staffChange } from "../controllers/auth.controller.ts";

const OrganizationStaffAuthorizationRouter = Router();

OrganizationStaffAuthorizationRouter.post("/login", staffLogin)
OrganizationStaffAuthorizationRouter.delete("/logout", staffLogout);
OrganizationStaffAuthorizationRouter.post("/refresh", staffRefreshToken);
OrganizationStaffAuthorizationRouter.get("/me", authenticateToken, staffMe);
OrganizationStaffAuthorizationRouter.post("/change-password", authenticateToken, staffChange);

export default OrganizationStaffAuthorizationRouter;

/**
 * @swagger
 * tags:
 *   name: OrganizationStaffAuth
 *   description: Авторизация и управление сессиями сотрудников организации
 */

/**
 * @swagger
 * /staffAuthorization/login:
 *   post:
 *     summary: Авторизация сотрудника (Login)
 *     tags: [OrganizationStaffAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email сотрудника
 *               password:
 *                 type: string
 *                 description: Пароль сотрудника
 *     responses:
 *       200:
 *         description: Успешная авторизация
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
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/OrganizationStaff'
 *                     accessToken:
 *                       type: string
 *       401:
 *         description: Неверный email или пароль
 *       403:
 *         description: Аккаунт деактивирован
 */

/**
 * @swagger
 * /staffAuthorization/logout:
 *   post:
 *     summary: Выход сотрудника (Logout)
 *     tags: [OrganizationStaffAuth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешный выход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Необходима авторизация
 */

/**
 * @swagger
 * /staffAuthorization/refresh:
 *   post:
 *     summary: Обновление access токена (Refresh Token)
 *     tags: [OrganizationStaffAuth]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           description: Refresh токен (Bearer TOKEN)
 *     responses:
 *       200:
 *         description: Новый access токен успешно создан
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
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *       401:
 *         description: Неверный или просроченный refresh токен
 */

/**
 * @swagger
 * /staffAuthorization/me:
 *   get:
 *     summary: Получение данных текущего пользователя
 *     tags: [OrganizationStaffAuth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные текущего пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/OrganizationStaff'
 *       401:
 *         description: Необходима авторизация
 *       404:
 *         description: Пользователь не найден
 */

/**
 * @swagger
 * /staffAuthorization/change-password:
 *   post:
 *     summary: Смена пароля сотрудника
 *     tags: [OrganizationStaffAuth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Текущий пароль
 *               newPassword:
 *                 type: string
 *                 description: Новый пароль (минимум 6 символов)
 *     responses:
 *       200:
 *         description: Пароль успешно изменён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Ошибка валидации пароля
 *       401:
 *         description: Неверный текущий пароль или неавторизован
 *       403:
 *         description: Аккаунт деактивирован
 *       404:
 *         description: Пользователь не найден
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
 *           description: Информация об организации (id, name)
 *         branches:
 *           type: array
 *           description: Массив филиалов сотрудника
 *           items:
 *             type: object
 *             description: Филиал (id, name, address)
 *         firstname:
 *           type: string
 *         lastname:
 *           type: string
 *         username:
 *           type: string
 *           nullable: true
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
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */