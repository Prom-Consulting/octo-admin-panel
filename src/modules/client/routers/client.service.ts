import express from "express";
import { getClientSelf, updateClientSelf } from "../controllers/clietn.controller.ts";

const ClientServiceRouter = express.Router();

// путь - /clients
ClientServiceRouter.get("/", getClientSelf);
ClientServiceRouter.patch("/", updateClientSelf);

/**
 * @openapi
 * tags:
 *   - name: Client Self
 *     description: Эндпоинты для работы авторизованного клиента
 */

/**
 * @openapi
 * /clients:
 *   get:
 *     summary: Получить данные авторизованного клиента
 *     description: Возвращает данные текущего клиента, авторизованного через клиентский токен.
 *     tags:
 *       - Client Self
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные клиента успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Client"
 *       401:
 *         description: Не авторизован — отсутствует или неверный токен
 *       404:
 *         description: Клиент не найден
 */

/**
 * @openapi
 * /clients:
 *   patch:
 *     summary: Обновить данные авторизованного клиента
 *     description: >
 *       Обновление имени, фамилии, номера телефона или пароля клиента.
 *       Если изменяется **номер телефона** или **пароль**, обязательно нужно передать `currentPassword`.
 *     tags:
 *       - Client Self
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *                 description: Новое имя
 *               lastname:
 *                 type: string
 *                 description: Новая фамилия
 *               phoneNumber:
 *                 type: string
 *                 description: Новый номер телефона
 *               password:
 *                 type: string
 *                 description: Новый пароль
 *               currentPassword:
 *                 type: string
 *                 description: Текущий пароль — обязателен при смене пароля или номера телефона
 *           example:
 *             firstname: "Асан"
 *             lastname: "Усенов"
 *             phoneNumber: "+996700123456"
 *             password: "newPass123"
 *             currentPassword: "oldPass123"
 *     responses:
 *       200:
 *         description: Данные клиента успешно обновлены
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Client"
 *       400:
 *         description: Ошибка валидации (например, не передан currentPassword)
 *       401:
 *         description: Текущий пароль неверный
 *       404:
 *         description: Клиент не найден
 */


export default ClientServiceRouter;