import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import User from "./User.ts";
import jwt from "jsonwebtoken";
import type { UserToCreate } from "../../types";
import bcrypt from "bcrypt";
import Organization from "../organization/Organization.ts";
import { envConfig } from "../../../config/envConfig.ts";

const UserServiceRoute = Router();

type UserAuthorization = {
  email: string;
  password: string;
};

UserServiceRoute.get(
  "/getUserList",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await User.findAll();

      return res.status(200).json({
        message: "user list",
        data: result,
      });
    } catch (e) {
      next(e);
    }
  }
);

UserServiceRoute.post(
  "/auth",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password }: UserAuthorization = req.body;

      if (!email || !password) {
        return res.status(401).send({
          error: "email or password required",
        });
      }

      const user = await User.findOne({
        where: {
          email,
        },
        attributes: ["id", "email", "password", "role"],
      });

      if (!user) {
        return res.status(401).send({
          success: false,
          message: "Invalid credentials user",
        });
      }

      const organization = await Organization.findOne({
        where: { user_id: user.id },
      });

      if (!organization) {
        return res
          .status(401)
          .send({ message: "No organization found for this user" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials password",
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          organizationName: organization.name,
        },
        envConfig.JWT_SECRET!,
        { expiresIn: "365d" } // срок жизни токена
      );

      return res.status(200).json({
        success: true,
        message: "Success",
        token,
        user: {
          id: user.id,
        },
      });
    } catch (e) {
      console.error("Login error:", e);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

//можно менять пароль и убрать email isActive

interface UserToChange extends UserToCreate {
  password: string;
}

UserServiceRoute.put(
  "/changeUserData/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;
      const userData: UserToChange = req.body;

      const { first_name, last_name, password, email } = userData;

      if (!first_name || !last_name) {
        return res.status(422).send({
          error: "Inputs required",
        });
      }

      // ищем пользователя
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).send({
          error: "User not found",
        });
      }

      // проверяем, что email не занят другим пользователем
      const existingEmail = await User.findOne({
        where: {
          email,
        },
      });

      if (existingEmail && existingEmail.id !== Number(userId)) {
        return res.status(422).send({
          error: "A user with this email address already exists.",
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      // обновляем все поля
      if (last_name) user.last_name = last_name;
      if (first_name) user.first_name = first_name;
      user.password = hashedPassword;

      await user.save();

      return res.status(200).json({
        user,
      });
    } catch (error) {
      console.error("ERROR -------", error);
      next(error);
    }
  }
);

UserServiceRoute.delete(
  "/deleteUserData/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      await user.destroy();

      return res.status(200).json({
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("ERROR -------", error);
      next(error);
    }
  }
);

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
 *             properties:
 *               email:
 *                 type: string
 *               password:
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
 *               first_name:
 *                 type: string
 *               last_name:
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
 *         first_name:
 *           type: string
 *         last_name:
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
