import { Router } from "express";
import { changeUserData } from "../controller/user.controller.ts";
import { userLogin, userLogout, userRefreshToken } from "../controller/auth.controller.ts";
import { authenticateToken, authorizeRoles } from "../../../middleware/authUserMiddleware.ts";

const UserServiceRoute = Router();

UserServiceRoute.post("/auth", userLogin);
UserServiceRoute.post("/refresh", userRefreshToken);
UserServiceRoute.delete("/logout", userLogout);

UserServiceRoute.use(authenticateToken, authorizeRoles("owner"));
UserServiceRoute.put("/changeUserData/:id", changeUserData);

export default UserServiceRoute;

/**
 * @openapi
 * tags:
 *   - name: User
 *     description: Авторизация и управление пользователями(владельцами)
 */

/**
 * @openapi
 * /user/auth:
 *   post:
 *     summary: Авторизация пользователя
 *     description: >
 *       Авторизует пользователя по email, паролю и названию организации.
 *       В случае успеха возвращает **access_token** и устанавливает **refreshToken** в httpOnly cookie.
 *       Refresh токен используется для продления сессии, а access токен — для доступа к защищённым маршрутам.
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
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *               organizationName:
 *                 type: string
 *                 example: "MyCompany"
 *     responses:
 *       200:
 *         description: Успешная авторизация пользователя
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
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     role:
 *                       type: string
 *                       example: owner
 *                     first_name:
 *                       type: string
 *                       example: Aizada
 *                     last_name:
 *                       type: string
 *                       example: Turdalieva
 *       401:
 *         description: Неверные учетные данные или организация не найдена
 */

/**
 * @openapi
 * /user/refresh:
 *   post:
 *     summary: Обновление access токена пользователя
 *     description: >
 *       Обновляет access токен, используя refresh токен из httpOnly cookie (`refreshToken`).
 *       Пользователь должен указать `organizationName`, если связан с несколькими организациями.
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               organizationName:
 *                 type: string
 *                 example: "MyCompany"
 *     responses:
 *       200:
 *         description: Новый access токен успешно выдан
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
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Отсутствует или недействительный refresh токен
 *       404:
 *         description: Пользователь или организация не найдены
 */

/**
 * @openapi
 * /user/logout:
 *   delete:
 *     summary: Выход пользователя
 *     description: >
 *       Удаляет refresh токен из cookie и завершает сессию пользователя.
 *       После выхода необходимо заново пройти авторизацию.
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Пользователь успешно вышел из системы
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
 *                   example: Logged out successfully
 */

/**
 * @openapi
 * /user/changeUserData/{id}:
 *   put:
 *     summary: Изменить данные пользователя
 *     description: >
 *       Позволяет владельцу изменить данные пользователя или сотруднику — только свои.
 *       При обновлении пароля он хэшируется перед сохранением.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
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
 *                 example: Beka
 *               lastname:
 *                 type: string
 *                 example: Mamytov
 *               email:
 *                 type: string
 *                 example: beka@example.com
 *               password:
 *                 type: string
 *                 example: newPassword123
 *     responses:
 *       200:
 *         description: Данные пользователя успешно изменены
 *       403:
 *         description: Пользователь не имеет права изменять чужие данные
 *       404:
 *         description: Пользователь не найден
 *       422:
 *         description: Ошибка валидации входных данных
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
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         email:
 *           type: string
 *           example: user@example.com
 *         first_name:
 *           type: string
 *           example: Aizada
 *         last_name:
 *           type: string
 *           example: Turdalieva
 *         role:
 *           type: string
 *           example: owner
 *         isActive:
 *           type: boolean
 *           example: true
 */
