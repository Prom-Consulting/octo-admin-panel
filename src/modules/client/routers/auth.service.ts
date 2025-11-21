import express from "express";
import {
  loginClient,
  logoutClient,
  refreshClientToken,
  registerClientDev,
} from "../controllers/auth.controller.ts";

const ClientAuthServiceRouter = express.Router();

ClientAuthServiceRouter.post("/register-dev", registerClientDev);
// ClientAuthServiceRouter.post("/start-register", startRegister);
ClientAuthServiceRouter.post("/", loginClient);
ClientAuthServiceRouter.post("/refresh", refreshClientToken);
ClientAuthServiceRouter.delete("/logout", logoutClient);

/**
 * @openapi
 * tags:
 *   - name: ClientAuth
 *     description: Авторизация и аутентификация клиентов
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Client:
 *       type: object
 *       description: Сущность клиента
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный ID клиента (создан через календарь/мессенджер или онлайн-запись)
 *
 *         first_name:
 *           type: string
 *
 *         last_name:
 *           type: string
 *           nullable: true
 *
 *         password:
 *           type: string
 *           description: Хэшированный пароль клиента
 *
 *         custom_name:
 *           type: string
 *           nullable: true
 *           description: Кастомное имя, полученное из интеграций
 *
 *         username:
 *           type: string
 *           nullable: true
 *           description: Username из внешних интеграций (например, Telegram)
 *
 *         phone_number:
 *           type: string
 *
 *         token:
 *           type: string
 *           nullable: true
 *           description: Access-токен устройства, сохранённый в базе
 *
 *         is_active:
 *           type: boolean
 *
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /clients/auth/register-dev:
 *   post:
 *     tags: [ClientAuth]
 *     summary: Регистрация клиента (dev-режим, без OTP)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ClientRegisterDevRequest"
 *           example:
 *             firstname: "Bob"
 *             lastname: "Y"
 *             phoneNumber: "996707797727"
 *             password: "123"
 *     responses:
 *       200:
 *         description: Клиент успешно зарегистрирован
 *         content:
 *           application/json:
 *             example:
 *               client:
 *                 id: "register_1763716405669_RZvMW3biBVr8opUw"
 *                 first_name: "Bob"
 *                 last_name: "Y"
 *                 is_active: true
 *                 updatedAt: "2025-11-21T09:13:25.708Z"
 *                 createdAt: "2025-11-21T09:13:25.672Z"
 *                 custom_name: null
 *                 token: "token"
 *       400:
 *         description: Отсутствуют обязательные поля или клиент уже существует
 */

/**
 * @openapi
 * /clients/auth:
 *   post:
 *     tags: [ClientAuth]
 *     summary: Авторизация клиента по номеру телефона и паролю
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ClientLoginRequest"
 *           example:
 *             firstname: "Bob"
 *             lastname: "Y"
 *             phoneNumber: "996707797727"
 *             password: "123"
 *     responses:
 *       200:
 *         description: Успешный вход в систему
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Client"
 *       400:
 *         description: Неверный номер телефона или пароль
 */

/**
 * @openapi
 * /clients/auth/refresh:
 *   post:
 *     tags: [ClientAuth]
 *     summary: Обновление access-токена клиента
 *     responses:
 *       200:
 *         description: Новый access-токен
 *         content:
 *           application/json:
 *             example:
 *               token: "token"
 *       401:
 *         description: Refresh-токен отсутствует
 *       404:
 *         description: Клиент не найден
 */

/**
 * @openapi
 * /clients/auth/logout:
 *   delete:
 *     tags: [ClientAuth]
 *     summary: Выход клиента из системы и очистка refresh-токена
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешный выход
 *       401:
 *         description: Не авторизован или уже выполнен выход
 */


export default ClientAuthServiceRouter;