import { type NextFunction, type Request, type Response, Router } from "express";
import bcrypt from "bcrypt";
import AdminModel from "./AdminModel.ts";
import User from "../user/User.ts";
import type { UserToCreate } from "../../types";
import { generatePassword } from "../../methods/methods.ts";

const AdminServiceRoute = Router();

interface adminType {
  email: string;
  firstname: string;
  lastname?: string | null;
  password: string;
  role: "admin";
}

AdminServiceRoute.post(
  "/signUp",
  async (req: Request, res: Response, next: NextFunction) => {
   try {
     const { email, password, firstname, lastname }: adminType = req.body;

     const existedAdmin = await AdminModel.findOne({
       where: { email },
     });

     if (existedAdmin) {
       return res.status(422).send({ error: "Admin already exists" });
     }

     const hashedPassword = await bcrypt.hash(password, 10);

     const admin = {
       email,
       role: "admin" as const,
       password: hashedPassword,
       first_name: firstname,
       last_name: lastname
     };

     const newAdmin = await AdminModel.create(admin);

     return res.status(201).json({
       username: newAdmin.email,
       password: newAdmin.password,
       role: newAdmin.role,
       createdAt: newAdmin.createdAt,
     });
   } catch (error) {
   next(error);}
  }
);

AdminServiceRoute.post(
  "/createUsers",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userData: UserToCreate = req.body;

      const { firstname, email, lastname, isActive } = userData;

      if (!firstname || !email) {
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
        first_name: firstname,
        last_name: lastname,
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

/**
 * @openapi
 * /admin/createUsers:
 *   post:
 *     summary: Создать нового пользователя
 *     description: Создает нового пользователя (владельца) и автоматически генерирует пароль.
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - email
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: "Aidar"
 *               lastname:
 *                 type: string
 *                 example: "Bekov"
 *               email:
 *                 type: string
 *                 example: "aidarbekov@gmail.com"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *           example:
 *             firstname: "Aidar"
 *             lastname: "Bekov"
 *             email: "aidarbekov@gmail.com"
 *             isActive: true
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             example:
 *               message: "New user added"
 *               user:
 *                 id: 28
 *                 email: "aidarbekov@gmail.com"
 *                 first_name: "Aidar"
 *                 last_name: "Bekov"
 *                 role: "owner"
 *                 isActive: true
 *                 createdAt: "2025-11-11T08:03:07.767Z"
 *                 updatedAt: "2025-11-11T08:03:07.767Z"
 *               password: "generatedRandomPassword123"
 *       422:
 *         description: Ошибка валидации или пользователь уже существует
 *         content:
 *           application/json:
 *             examples:
 *               missingFields:
 *                 summary: Не указаны обязательные поля
 *                 value:
 *                   error: "Inputs required"
 *               duplicateUser:
 *                 summary: Пользователь уже существует
 *                 value:
 *                   error: "User already exists"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             example:
 *               error: "Internal server error"
 */


export default AdminServiceRoute;
