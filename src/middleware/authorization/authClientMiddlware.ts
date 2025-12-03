import type { NextFunction, Response, Request } from "express";
import { Client, verifyAccessToken } from "../../modules/client/models/Client.ts";
import jwt from "jsonwebtoken";
import type { ClientAuth } from "../../types";

export const authClientMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const decoded = verifyAccessToken(token) as ClientAuth;

    const client = await Client.findOne({
      where: { id: decoded.id, phone_number: decoded.phone_number },
    });

    if (!client) return res.status(404).json({ message: "Client not found" });

    req.client = decoded;
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
    return res.status(401).json({ message: "Invalid or expired token client", error });
  }
};