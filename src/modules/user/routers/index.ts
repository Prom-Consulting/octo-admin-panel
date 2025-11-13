import { Router } from "express";
import { changeUserData, deleteUser, getUserList } from "../controller/user.controller.ts";
import { userLogin, userLogout, userRefreshToken } from "../controller/auth.controller.ts";
import { authenticateToken, authorizeRoles } from "../../../middleware/authUserMiddleware.ts";

const UserServiceRoute = Router();



UserServiceRoute.post("/auth", userLogin);
UserServiceRoute.post("/refresh", userRefreshToken);
UserServiceRoute.delete("/logout", userLogout);

UserServiceRoute.use(authenticateToken, authorizeRoles("owner"));
UserServiceRoute.get("/getUserList", getUserList);
UserServiceRoute.put("/changeUserData/:id", changeUserData);
UserServiceRoute.delete("/deleteUserData/:id", deleteUser);

export default UserServiceRoute;

/**
 * @swagger
 * tags:
 *   name: User
 *   description: Работа с пользователями организации
 */

/**
 * @swagger
 * /user/getUserList:
 *   get:
 *     summary: Получить список пользователей организаций
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *
 * /user/auth:
 *   post:
 *     summary: Авторизация пользователя
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - organizationName
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               organizationName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Неверные данные авторизации
 *       500:
 *         description: Внутренняя ошибка сервера
 *
 * /user/changeUserData/{id}:
 *   put:
 *     summary: Обновить данные пользователя
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *               branches:
 *                 type: integer
 *               paidDate:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Данные пользователя обновлены
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Пользователь не найден
 *       422:
 *         description: Ошибка валидации
 *       500:
 *         description: Внутренняя ошибка сервера
 *
 * /user/deleteUserData/{id}:
 *   delete:
 *     summary: Удалить пользователя по ID
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Пользователь удалён
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 *
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         firstname:
 *           type: string
 *         lastname:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *         branches:
 *           type: integer
 *         paidDate:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
