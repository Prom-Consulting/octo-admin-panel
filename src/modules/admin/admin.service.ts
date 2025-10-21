import { type NextFunction, type Request, type Response, Router } from "express";
import bcrypt from "bcrypt";
import AdminModel from "./AdminModel.ts";
import User from "../user/User.ts";
import type { UserToCreate } from "../../types";
import { generatePassword } from "../../methods/methods.ts";

const AdminServiceRoute = Router();

interface adminType {
  username: string;
  password: string;
  role: "admin";
}

const AUTH_TOKEN = process.env.AUTHORIZATION_TOKEN;

AdminServiceRoute.post(
  "/signUp",
  async (req: Request, res: Response, next: NextFunction) => {
    const { username, password }: adminType = req.body;
    const authorizationToken = req.get("Auth-token");

    if (!authorizationToken) {
      return res.status(401).send({ message: "No token provided" });
    }

    if (authorizationToken !== AUTH_TOKEN) {
      return res.status(401).send({ message: "No token provided" });
    }

    const existedAdmin = await AdminModel.findOne({
      where: { username },
    });

    if (existedAdmin) {
      return res.status(422).send({ error: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = {
      username: username,
      role: "admin" as const,
      password: hashedPassword,
    };

    const newAdmin = await AdminModel.create(admin);

    return res.status(201).json({
      username: newAdmin.username,
      password: newAdmin.password,
      role: newAdmin.role,
      createdAt: newAdmin.createdAt,
    });
  }
);

/**
 * @openapi
 * /admin/createUsers:
 *   post:
 *     summary: Создать нового пользователя и базу данных для него
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationName
 *               - email
 *               - branches
 *             properties:
 *               organizationName:
 *                 type: string
 *                 example: "kulikov6"
 *               email:
 *                 type: string
 *                 example: "kulik6@gmail.com"
 *               branches:
 *                 type: integer
 *                 example: 5
 *               paidDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-09-17T15:45:00.000Z"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *           example:
 *             organizationName: "kulikov6"
 *             email: "kulik6@gmail.com"
 *             branches: 5
 *             paidDate: "2025-09-17T15:45:00.000Z"
 *             isActive: true
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 newUser:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 28
 *                     email:
 *                       type: string
 *                       example: "kulik6@gmail.com"
 *                     organizationName:
 *                       type: string
 *                       example: "kulikov6"
 *                     branches:
 *                       type: integer
 *                       example: 5
 *                     role:
 *                       type: string
 *                       example: "owner"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-26T08:03:07.767Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-26T08:03:07.767Z"
 *       422:
 *         description: Ошибка валидации или пользователь уже существует
 *         content:
 *           application/json:
 *             examples:
 *               missingFields:
 *                 summary: Обязательные поля не указаны
 *                 value:
 *                   error: "Inputs required"
 *               duplicateUser:
 *                 summary: Пользователь с таким organizationName уже существует
 *                 value:
 *                   error: "User already exists"
 *       500:
 *         description: Проблема с созданием базы данных
 *         content:
 *           application/json:
 *             example:
 *               error: "Database issue"
 */

AdminServiceRoute.post(
  "/createUsers",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userData: UserToCreate = req.body;

      const { first_name, email, last_name, isActive } = userData;

      if (!first_name || !email) {
        return res.status(422).send({
          error: "Inputs required",
        });
      }

      const existingUser = await User.findOne({
        where: {
          email,
        },
      });

      if (existingUser) {
        return res.status(422).send({
          error: "User already exists",
        });
      }

      const password = await generatePassword();
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        email: email,
        first_name,
        last_name,
        password: hashedPassword,
        isActive: isActive,
        role: "owner",
      });

      return res.send({ message: "New user added", user, password });
    } catch (error) {
      console.log("ERROR -------" + error);
      next(error);
    }
  }
);

export default AdminServiceRoute;
