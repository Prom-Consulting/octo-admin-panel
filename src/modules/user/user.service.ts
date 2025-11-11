import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import User, { generateAccessTokenForUser, generateRefreshTokenForUser } from "./User.ts";
import type { UserToCreate } from "../../types";
import bcrypt from "bcrypt";
import Organization, { type OrganizationAttributes } from "../organization/model/Organization.ts";
import type { WhereOptions } from "sequelize";
import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET } from "../../middleware/authUserMiddleware.ts";

const UserServiceRoute = Router();

type UserAuthorization = {
  email: string;
  password: string;
  organizationName: string;
};

interface UserToChange extends UserToCreate {
  password: string;
}

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
      const { email, password, organizationName }: UserAuthorization = req.body;

      if (!email || !password) {
        return res.status(401).send({
          error: "email or password required",
        });
      }

      const user = await User.findOne({
        where: {
          email,
        }
      });

      if (!user) {
        return res.status(401).send({
          success: false,
          message: "Invalid credentials user",
        });
      }
      const where: WhereOptions<OrganizationAttributes> = {
        user_id: user.id,
      };

      if (organizationName) {
        where.name = organizationName
      }

      const organization = await Organization.findOne({ where });

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

      const accessToken = generateAccessTokenForUser(user, organization.name);
      const refreshToken = generateRefreshTokenForUser(user);
      await user.update({token: refreshToken});

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        message: "Success",
        token: accessToken,
        refreshToken,
        user: {
          id: user.id,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      });
    } catch (e) {
      console.error("Login error:", e);
     next(e);
    }
  }
);

UserServiceRoute.post(
  "/refresh",
  async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      const { organizationName } = req.body;
      const where: WhereOptions<OrganizationAttributes> = { };

      if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token provided" });
      }

      const decoded: any = jwt.verify(refreshToken, JWT_REFRESH_SECRET!);
      if (!decoded) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!organizationName) {
        where.user_id = decoded.id;
      } else {
        where.name = organizationName;
      }

      const organization = await Organization.findOne({
        where,
      });

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const newAccessToken = generateAccessTokenForUser(user, organization.name);

      return res.json({
        success: true,
        token: newAccessToken,
      });
    } catch (e) {
      console.error("Refresh error:", e);
      return res.status(401).json({ message: "Token refresh failed" });
    }
  }
);

UserServiceRoute.put(
  "/changeUserData/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;
      const userData: UserToChange = req.body;

      const { firstname, lastname, password, email } = userData;

      if (!firstname || !lastname) {
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
      if (lastname) user.last_name = lastname;
      if (firstname) user.first_name = firstname;
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

UserServiceRoute.delete(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (e) {
      console.error("Logout error:", e);
      next(e);
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
