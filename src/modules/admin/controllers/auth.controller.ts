import type { NextFunction, Response, Request } from "express";
import AdminModel, { generateAccessTokenForAdmin, generateRefreshTokenForAdmin } from "../models/AdminModel.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../../../middleware/authUserMiddleware.ts";
import { refreshCookieOptions } from "../../../../config/cookie.ts";

export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({ error: "Username or password required" });
    }

    const admin = await AdminModel.findOne({
      where: { email },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const accessToken = generateAccessTokenForAdmin(admin);
    const refreshToken = generateRefreshTokenForAdmin(admin);
    await admin.update({ token: refreshToken });
    res.cookie("refreshToken", refreshToken, refreshCookieOptions );

    return res.status(200).json({
      success: true,
      message: "Success",
      user: {
        id: admin.id,
        username: admin.email,
        role: admin.role,
        first_name: admin.first_name,
        last_name: admin.last_name,
      },
      token: accessToken
    });
  } catch (e) {
    console.error("Login error:", e);
    next(e);
  }
}

export const adminTokenRefresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;

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

    const admin = await AdminModel.findOne({
      where: { email: decoded.email, id: decoded.id },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const newAccessToken = generateAccessTokenForAdmin(admin);
    return res.json({
      success: true,
      token: newAccessToken,
    });

  } catch (e) {
    next(e);
  }
}

export const adminLogout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number, email: string };
    if (!decoded) return res.status(401).json({ success: false, error: "Access token required" });

    const admin = await AdminModel.findOne({
      where: { id: decoded.id, email: decoded.email },
    });

    if (!admin) return res.status(400).json({ success: false, message: "Admin not found" });

    await admin.update({ token: null });

    res.clearCookie("refreshToken", refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (e) {
    next(e);
  }
}