import { Router } from "express";
import type { Response, Request, NextFunction } from "express";
import OrganizationStaff, {
  generateAccessTokenForStaff,
  generateRefreshTokenForStaff,
} from "./OrganizationStaff.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateToken, JWT_REFRESH_SECRET, JWT_SECRET } from "../../middleware/authStaffMiddleware.ts";

import type { UserToken } from "../../types";

const OrganizationStaffAuthorizationRouter = Router();

OrganizationStaffAuthorizationRouter.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const staff = await OrganizationStaff.findOne({
        where: { email },
      });

      if (!staff) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      if (!staff.is_active) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated. Please contact administrator",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, staff.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const accessToken = generateAccessTokenForStaff(staff);
      const refreshToken = generateRefreshTokenForStaff(staff);
      await staff.update({ token: refreshToken });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const { password: _, email: __, ...staffData } = staff.toJSON();

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: staffData,
          accessToken,
        },
      });
    } catch (e) {
      console.error("Error in login:", e);
      next(e);
    }
  }
);

OrganizationStaffAuthorizationRouter.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Access token is required",
        });
      }

      const staff = jwt.verify(token, JWT_SECRET) as UserToken;

      await OrganizationStaff.update(
        { token: null },
        { where: { id: staff.id } }
      );

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (e) {
      console.error("Error in logout:", e);
      next(e);
    }
  }
);

OrganizationStaffAuthorizationRouter.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      console.log(refreshToken);

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
        email: string;
        id: number;
      };

      const staff = await OrganizationStaff.findOne({
        where: { email: decoded.email },
        attributes: ["id", "email", "role", "organization", "is_active"],
      });

      if (!staff) {
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token",
        });
      }

      if (!staff.is_active) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      const newAccessToken = generateAccessTokenForStaff(staff);
      const newRefreshToken = generateRefreshTokenForStaff(staff);

      await staff.update({ token: newRefreshToken });

      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (e) {
      if (e instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token",
        });
      }
      if (e instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: "Refresh token expired",
        });
      }
      console.error("Error in refresh token:", e);
      next(e);
    }
  }
);

OrganizationStaffAuthorizationRouter.get(
  "/me",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const staff = await OrganizationStaff.findByPk(req.user.id, {
        attributes: { exclude: ["password", "token"] },
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: staff,
      });
    } catch (e) {
      console.error("Error in getMe:", e);
      next(e);
    }
  }
);

OrganizationStaffAuthorizationRouter.post(
  "/change-password",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long",
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const staff = await OrganizationStaff.findByPk(req.user.id);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Проверка текущего пароля
      const isPasswordValid = await bcrypt.compare(currentPassword, staff.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Хеширование нового пароля
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Обновление пароля
      await staff.update({ password: hashedPassword });

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (e) {
      console.error("Error in changePassword:", e);
      next(e);
    }
  }
);

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

