import { Router } from "express";
import { adminLogin, adminLogout, adminTokenRefresh } from "../controllers/auth.controller.ts";

const AuthorizationAdminService = Router();

AuthorizationAdminService.post("/login", adminLogin);
AuthorizationAdminService.post("/refresh", adminTokenRefresh);
AuthorizationAdminService.delete("/logout", adminLogout);

/**
 * @openapi
 * /admin/auth/login:
 *   post:
 *     summary: Авторизация администратора
 *     tags:
 *       - Authorization
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             username: "admin"
 *             password: "123456"
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Success"
 *               user:
 *                 id: 1
 *                 username: "admin"
 *                 role: "admin"
 *       401:
 *         description: Неверные данные для входа
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Invalid credentials"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Internal server error"
 */

export default AuthorizationAdminService;
