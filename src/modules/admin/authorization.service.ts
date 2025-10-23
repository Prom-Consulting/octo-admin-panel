import { type NextFunction, type Request, type Response, Router } from "express";
import AdminModel from "./AdminModel.ts";
import bcrypt from "bcrypt";

const authorizationService = Router();

interface adminAuthorization {
  username: string;
  password: string;
  role: "admin";
}

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    username: string;
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

authorizationService.post(
  "/auth",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password }: adminAuthorization = req.body;

      if (!username || !password) {
        return res.status(401).json({ error: "Username or password required" });
      }

      const user = await AdminModel.findOne({
        where: { username },
        attributes: ["id", "username", "password", "role"],
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        } as AuthResponse);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        } as AuthResponse);
      }

      return res.status(200).json({
        success: true,
        message: "Success",
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      } as AuthResponse);
    } catch (e) {
      console.error("Login error:", e);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      } as AuthResponse);
    }
  }
);

export default authorizationService;
