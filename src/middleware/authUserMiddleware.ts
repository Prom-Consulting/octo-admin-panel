import type { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";
import OrganizationStaff, { type BranchInfo } from "../modules/staff/models/OrganizationStaff.ts";
import User from "../modules/user/models/User.ts";
import { envConfig } from "../../config/envConfig.ts";
import type { BranchAttributes } from "../modules/organization/models/Branch.ts";
import type { OrganizationAttributes } from "../modules/organization/models/Organization.ts";

export const JWT_SECRET = envConfig.JWT_SECRET || "default_fallback_secret";
export const JWT_REFRESH_SECRET = envConfig.JWT_REFRESH_SECRET || "default_fallback_secret";

// Расширяем интерфейс Request для добавления информации о пользователе
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        firstname: string;
        lastname?: string | null;
        email: string;
        role: string;
        organizationId?: number | null;
        branches?: BranchInfo[] | null;
      };
      branch?: BranchAttributes;
      organization?: OrganizationAttributes;
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
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      first_name: string;
      last_name?: string;
      email: string;
      role: string;
      organizationId?: number;
      organizationName?: string;
    };

    const user = await User.findOne({
      where: { email: decoded.email },
      attributes: ["id", "email", "role", "first_name", "last_name"],
    });

    if (user) {
      req.user = {
        id: user.id,
        firstname: user.first_name,
        lastname: user.last_name,
        email: user.email,
        role: user.role,
        organizationId: null,
        branches: null,
      };
      return next();
    }

    const staff = await OrganizationStaff.findOne({
      where: { email: decoded.email },
      attributes: [
        "id",
        "email",
        "role",
        "organization",
        "branches",
        "is_active",
        "first_name",
        "last_name",
      ],
    });

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found",
      });
    }

    if (!staff.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    req.user = {
      id: staff.id,
      firstname: staff.first_name,
      lastname: staff.last_name,
      email: staff.email,
      role: staff.role,
      organizationId: staff.organization.id,
      branches: staff.branches
    };

    next();
  } catch (error) {
    console.log("Auth middleware error", error);

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
    return next();
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
