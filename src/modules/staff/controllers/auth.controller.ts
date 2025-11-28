import type { NextFunction, Response, Request } from "express";
import OrganizationStaff, {
  generateAccessTokenForStaff,
  generateRefreshTokenForStaff,
} from "../models/OrganizationStaff.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../../../middleware/authorization/authUserMiddleware.ts";
import type { UserToken } from "../../../types";
import { refreshCookieOptions } from "../../../../config/cookie.ts";

export const staffLogin = async (req: Request, res: Response, next: NextFunction) => {
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

    res.cookie("refreshToken", refreshToken, refreshCookieOptions );

    const { password: _, email: __, token: ___, ...staffData } = staff.toJSON();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: staffData,
        token: accessToken,
      },
    });
  } catch (e) {
    console.error("Error in login:", e);
    next(e);
  }
};

export const staffLogout = async (req: Request, res: Response, next: NextFunction) => {
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

    res.clearCookie("refreshToken", refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (e) {
    console.error("Error in logout:", e);
    next(e);
  }
};

export const staffRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
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

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token: newAccessToken,
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
};

export const staffMe = async (req: Request, res: Response, next: NextFunction) => {
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
};

export const staffChange = async (req: Request, res: Response, next: NextFunction) => {
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
};