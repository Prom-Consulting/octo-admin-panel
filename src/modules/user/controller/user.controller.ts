import type { NextFunction, Request, Response } from "express";
import User, { type UserAttributes } from "../models/User.ts";
import type { WhereOptions } from "sequelize";
import bcrypt from "bcrypt";
import type { UserToCreate } from "../../../types";
import { generatePassword } from "../../../methods/methods.ts";

interface UserToChange extends UserToCreate {
  password: string;
}

export const getUserList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { isActive } = req.query;
    const where: WhereOptions<UserAttributes> = {};

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const result = await User.findAll({ where });

    return res.status(200).json({
      message: "user list",
      data: result,
    });
  } catch (e) {
    next(e);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
};

export const changeUserData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.params.id;
    const userData: UserToChange = req.body;
    const authUser = req.user!;

    const { firstname, lastname, password, email } = userData;

    if (!firstname || !lastname) {
      return res.status(422).send({
        error: "Inputs required",
      });
    }

    if (authUser.role === "owner" && authUser.id !== Number(userId)) {
      return res.status(403).json({ error: "You can only modify your own data." });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).send({
        error: "User not found",
      });
    }

    const existingEmail = await User.findOne({
      where: {
        email,
      },
    });

    if (existingEmail && existingEmail.id !== Number(userId)) {
      return res.status(422).send({
        error: "A user with this email address already exists.",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    if (lastname) user.last_name = lastname;
    if (firstname) user.first_name = firstname;
    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Error change user data", error);
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.params.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    await user.destroy();

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error delete user", error);
    next(error);
  }
};
