import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { envConfig } from "../../config/envConfig.ts";

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
