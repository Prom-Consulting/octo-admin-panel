import { Router } from "express";
import { adminLogin, adminLogout, adminTokenRefresh } from "../controllers/auth.controller.ts";

const AuthorizationAdminService = Router();

AuthorizationAdminService.post("/", adminLogin);
AuthorizationAdminService.post("/refresh", adminTokenRefresh);
AuthorizationAdminService.delete("/logout", adminLogout);

/**
 * @openapi
 * tags:
 *   - name: Admin Authorization
 *     description: Маршруты для авторизации администраторов, управления токенами и выходом из системы.
 */

/**
 * @openapi
 * /admin/auth:
 *   post:
 *     summary: Авторизация администратора
 *     description: >
 *       Выполняет вход администратора по email и паролю.
 *       В случае успеха возвращает **access_token** (JWT) для последующих запросов и устанавливает **refreshToken** в httpOnly cookie.
 *       Access-токен используется для аутентификации, а refresh-токен позволяет обновить сессию без повторного входа.
 *     tags: [Admin Authorization]
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
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: "securePassword123"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Success
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     username:
 *                       type: string
 *                       example: admin@example.com
 *                     role:
 *                       type: string
 *                       example: owner
 *                     first_name:
 *                       type: string
 *                       example: Bekbol
 *                     last_name:
 *                       type: string
 *                       example: Mamytov
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Неверные учетные данные
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid credentials
 */

/**
 * @openapi
 * /admin/auth/refresh:
 *   post:
 *     summary: Обновление access токена
 *     description: >
 *       Использует refresh токен из cookie (`refreshToken`), чтобы получить новый **access_token** без повторного логина.
 *       Refresh токен хранится только в httpOnly cookie (то есть недоступен JavaScript).
 *     tags: [Admin Authorization]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Успешное обновление access токена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: "newAccessToken123..."
 *       400:
 *         description: Отсутствует refresh токен в cookie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Refresh token is required
 *       401:
 *         description: Невалидный refresh токен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid refresh token
 */

/**
 * @openapi
 * /admin/auth/logout:
 *   delete:
 *     summary: Выход администратора из системы
 *     description: >
 *       Удаляет refresh токен из базы и очищает cookie `refreshToken`.
 *       Access токен передаётся в заголовке `Authorization: Bearer <token>`.
 *       После выхода необходимо снова выполнить вход для получения новых токенов.
 *     tags: [Admin Authorization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешный выход из системы
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       401:
 *         description: Токен отсутствует или недействителен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Access token is required
 *       400:
 *         description: Администратор не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Admin not found
 */

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: refreshToken
 */


export default AuthorizationAdminService;
