import type { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";
import OrganizationStaff from "../modules/staff/OrganizationStaff.ts";
import { envConfig } from "../../config/envConfig.ts";

const JWT_SECRET = envConfig.JWT_SECRET!;

// Расширяем интерфейс Request для добавления информации о пользователе
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        organizationId: number;
      };
    }
  }
}

// Middleware для проверки JWT токена
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // Верифицируем токен
    const decoded = jwt.verify(token, JWT_SECRET) as {
      email: string;
      role: string;
      organizationId: number;
    };

    // Проверяем существование пользователя в базе
    const staff = await OrganizationStaff.findOne({
      where: { email: decoded.email, token },
      attributes: ["id", "email", "role", "organization", "is_active"],
    });

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found",
      });
    }

    // Проверяем активность пользователя
    if (!staff.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Добавляем информацию о пользователе в request
    req.user = {
      id: staff.id,
      email: staff.email,
      role: staff.role,
      organizationId: staff.organization.id,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Middleware для проверки роли
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions",
      });
    }

    next();
  };
};

// Middleware для проверки принадлежности к организации
export const checkOrganizationAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const organizationId = req.query.organizationId || req.body.organization?.id;

  if (organizationId && req.user.organizationId !== Number(organizationId)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You don't belong to this organization",
    });
  }

  next();
};
