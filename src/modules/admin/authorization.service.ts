import { type NextFunction, type Request, type Response, Router } from "express";
import AdminModel, {
  generateAccessTokenForAdmin,
  generateRefreshTokenForAdmin,
} from "./AdminModel.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../../middleware/authUserMiddleware.ts";

const AuthorizationAdminService = Router();

// interface adminAuthorization {
//   email: string;
//   password: string;
//   role: "admin";
// }

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * @openapi
 * /admin/auth:
 *   post:
 *     summary: Авторизация администратора
 *     tags:
 *       - Authorization
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             username: "admin"
 *             password: "123456"
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Success"
 *               user:
 *                 id: 1
 *                 username: "admin"
 *                 role: "admin"
 *       401:
 *         description: Неверные данные для входа
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Invalid credentials"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               message: "Internal server error"
 */

AuthorizationAdminService.post(
  "/auth",
  async (req: Request, res: Response, next: NextFunction) => {
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
        } as AuthResponse);
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        } as AuthResponse);
      }

      const accessToken = generateAccessTokenForAdmin(admin);
      admin.token = generateRefreshTokenForAdmin(admin);
      await admin.save();

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
        access_token: accessToken
      });
    } catch (e) {
      console.error("Login error:", e);
     next(e);
    }
  }
);

AuthorizationAdminService.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
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
});

AuthorizationAdminService.delete("/logout", async (req: Request, res: Response, next: NextFunction) => {
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
    next(e);
  }
});

export default AuthorizationAdminService;
