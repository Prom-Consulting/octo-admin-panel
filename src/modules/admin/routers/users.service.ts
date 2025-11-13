import express from "express";
import { changeUserData, createUser, deleteUser, getUserList } from "../../user/controller/user.controller.ts";
import { authAdminMiddleware } from "../../../middleware/authAdminMiddleware.ts";
import { authorizeRoles } from "../../../middleware/authUserMiddleware.ts";

const AdminUsersService = express.Router();

AdminUsersService.use(authAdminMiddleware, authorizeRoles("admin"));

AdminUsersService.get("/getUserList", getUserList);
AdminUsersService.post("/createUser", createUser)
AdminUsersService.put("/changeUserData/:id", changeUserData);
AdminUsersService.delete("/deleteUserData/:id", deleteUser);

/**
 * @swagger
 * tags:
 *   - name: Admin Users
 *     description: Управление пользователями/владельцами организаций (owner). Доступно только для администраторов
 */

/**
 * @swagger
 * /admin/user/getUserList:
 *   get:
 *     summary: Получить список пользователей
 *     description: Возвращает список всех пользователей. Можно фильтровать по активности.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Фильтр по активности пользователя (`true` — активные, `false` — неактивные)
 *     responses:
 *       200:
 *         description: Список пользователей успешно получен.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: user list
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Пользователь не авторизован или не имеет прав администратора.
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

/**
 * @swagger
 * /admin/user/createUser:
 *   post:
 *     summary: Создать нового пользователя
 *     description: Создаёт нового пользователя с ролью `owner`. Пароль генерируется автоматически и возвращается в ответе.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - email
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: Айбек
 *                 description: Имя пользователя
 *               lastname:
 *                 type: string
 *                 example: Токтосунов
 *                 description: Фамилия пользователя
 *               email:
 *                 type: string
 *                 example: aybek@example.com
 *                 description: Email пользователя (уникален)
 *               isActive:
 *                 type: boolean
 *                 example: true
 *                 description: Статус активности пользователя
 *     responses:
 *       200:
 *         description: Пользователь успешно создан.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: New user added
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 password:
 *                   type: string
 *                   example: Abc123!xyz
 *                   description: Сгенерированный пароль нового пользователя
 *       401:
 *         description: Пользователь не авторизован или не имеет прав администратора.
 *       422:
 *         description: Некорректные или неполные входные данные, либо пользователь уже существует.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Inputs required
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

/**
 * @swagger
 * /admin/user/changeUserData/{id}:
 *   put:
 *     summary: Изменить данные пользователя
 *     description: Позволяет администратору изменить данные пользователя по ID.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID пользователя, чьи данные необходимо изменить
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - password
 *               - email
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: Иван
 *               lastname:
 *                 type: string
 *                 example: Иванов
 *               password:
 *                 type: string
 *                 example: NewPass123!
 *               email:
 *                 type: string
 *                 example: ivanov@example.com
 *     responses:
 *       200:
 *         description: Данные пользователя успешно обновлены.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Доступ запрещён. Например, владелец пытается изменить чужие данные.
 *       404:
 *         description: Пользователь не найден.
 *       422:
 *         description: Некорректные входные данные.
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

/**
 * @swagger
 * /admin/user/deleteUserData/{id}:
 *   delete:
 *     summary: Удалить пользователя
 *     description: Удаляет пользователя по его ID.
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID пользователя для удаления
 *     responses:
 *       200:
 *         description: Пользователь успешно удалён.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       404:
 *         description: Пользователь не найден.
 *       500:
 *         description: Внутренняя ошибка сервера.
 */

export default AdminUsersService;