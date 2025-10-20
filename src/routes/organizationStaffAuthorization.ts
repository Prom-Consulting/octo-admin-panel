import { Router } from "express";
import type { Response, Request, NextFunction } from "express";
import OrganizationStaff from "../models/OrganizationStaff.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middleware/authStaffMiddleware.ts";
import { envConfig } from "../../config/envConfig.ts";

const JWT_SECRET = envConfig.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

const OrganizationStaffAuthorizationRouter = Router();

// Авторизация (Login)
OrganizationStaffAuthorizationRouter.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // Валидация входных данных
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // Поиск пользователя
      const staff = await OrganizationStaff.findOne({
        where: { email },
      });

      if (!staff) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Проверка активности аккаунта
      if (!staff.is_active) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated. Please contact administrator",
        });
      }

      // Проверка пароля
      const isPasswordValid = await bcrypt.compare(password, staff.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Генерация токенов
      const accessToken = jwt.sign(
        {
          email: staff.email,
          role: staff.role,
          organizationId: staff.organization.id,
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      const refreshToken = jwt.sign(
        {
          email: staff.email,
          organizationId: staff.organization.id,
        },
        JWT_REFRESH_SECRET,
        { expiresIn: "90d" }
      );

      // Обновление токена в базе
      await staff.update({ token: accessToken });

      // Подготовка данных для ответа (без пароля)
      const staffData = staff.toJSON();

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: staffData,
          accessToken,
          refreshToken,
        },
      });
    } catch (e) {
      console.error("Error in login:", e);
      next(e);
    }
  }
);

// Выход (Logout)
OrganizationStaffAuthorizationRouter.post(
  "/logout",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Удаляем токен из базы данных
      await OrganizationStaff.update(
        { token: null },
        { where: { id: req.user.id } }
      );

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

// Обновление токена (Refresh Token)
OrganizationStaffAuthorizationRouter.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.headers["authorization"];

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      // Верификация refresh токена
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
        email: string;
        organizationId: number;
      };

      // Поиск пользователя
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

      // Проверка активности
      if (!staff.is_active) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      // Генерация нового access токена
      const newAccessToken = jwt.sign(
        {
          email: staff.email,
          role: staff.role,
          organizationId: staff.organization.id,
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      // Обновление токена в базе
      await staff.update({ token: newAccessToken });

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

// Получение текущего пользователя (Me)
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

// Смена пароля
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
