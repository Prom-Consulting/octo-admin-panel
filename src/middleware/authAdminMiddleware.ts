import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { envConfig } from "../../config/envConfig.ts";
import { JWT_SECRET } from "./authUserMiddleware.ts";
import AdminModel from "../modules/admin/models/AdminModel.ts";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const secret = envConfig.JWT_SECRET!;
    const decoded = jwt.verify(token, secret);
    (req as any).user = decoded; // прикрепляем юзера к req
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const authAdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }
    const token = authHeader.split(" ")[1];

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
    };

    const admin = await AdminModel.findOne({
      where: { id: decoded.id, email: decoded.email, role: decoded.role },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or admin not found',
      });
    }

    req.user = {
      id: admin.id,
      firstname: admin.first_name,
      lastname: admin.last_name,
      email: admin.email,
      role: admin.role,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
