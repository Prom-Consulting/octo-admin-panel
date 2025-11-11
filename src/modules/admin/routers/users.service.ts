import express, { type NextFunction, type Request, type Response } from "express";
import type { UserToCreate } from "../../../types";
import User from "../../user/User.ts";
import { generatePassword } from "../../../methods/methods.ts";
import bcrypt from "bcrypt";

const AdminUsersService = express.Router();

AdminUsersService.post(
  "/user",
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

export default AdminUsersService;