import type { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";
import OrganizationStaff from "../modules/staff/OrganizationStaff.ts";
import { envConfig } from "../../config/envConfig.ts";
import User from "../modules/user/User.ts";

const JWT_SECRET = envConfig.JWT_SECRET!;

// Расширяем интерфейс Request для добавления информации о пользователе
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        organizationId?: number | null;
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
      organizationId?: number;
      organizationName?: string;
    };

    const user = await User.findOne({
      where: { email: decoded.email },
      attributes: ['id', 'email', 'role', 'first_name', 'last_name'],
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role || 'owner',
        organizationId: null,
      };
      return next();
    }

    const staff = await OrganizationStaff.findOne({
      where: { email: decoded.email, token },
      attributes: ['id', 'email', 'role', 'organization', 'is_active', 'first_name', 'last_name'],
    });

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found',
      });
    }

    if (!staff.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

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

  if (req.user.role === "owner") {
    next();
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
