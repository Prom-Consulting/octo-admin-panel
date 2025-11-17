import type { NextFunction, Request, Response } from "express";
import User, { generateAccessTokenForUser, generateRefreshTokenForUser } from "../models/User.ts";
import type { WhereOptions } from "sequelize";
import Organization, { type OrganizationAttributes } from "../../organization/models/Organization.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET } from "../../../middleware/authUserMiddleware.ts";

export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, organizationName } = req.body;

    if (!email || !password) {
      return res.status(401).send({
        error: "email or password required",
      });
    }

    const user = await User.findOne({
      where: {
        email,
      }
    });

    if (!user) {
      return res.status(401).send({
        success: false,
        message: "Invalid credentials user",
      });
    }
    const where: WhereOptions<OrganizationAttributes> = {
      user_id: user.id,
    };

    if (organizationName) {
      where.name = organizationName
    }

    const organization = await Organization.findOne({ where });

    if (!organization) {
      return res
        .status(401)
        .send({ message: "No organization found for this user" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials password",
      });
    }

    const accessToken = generateAccessTokenForUser(user, organization.name);
    const refreshToken = generateRefreshTokenForUser(user);
    await user.update({token: refreshToken});

    res.cookie("refreshToken", refreshToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Success",
      token: accessToken,
      user: {
        id: user.id,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (e) {
    console.error("Login error:", e);
    next(e);
  }
};

export const userRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const { organizationName } = req.body;
    const where: WhereOptions<OrganizationAttributes> = { };

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const decoded: any = jwt.verify(refreshToken, JWT_REFRESH_SECRET!);
    if (!decoded) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!organizationName) {
      where.user_id = decoded.id;
    } else {
      where.name = organizationName;
    }

    const organization = await Organization.findOne({
      where,
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const newAccessToken = generateAccessTokenForUser(user, organization.name);

    return res.json({
      success: true,
      token: newAccessToken,
    });
  } catch (e) {
    console.error("Refresh error:", e);
    next(e);
  }
};

export const userLogout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (e) {
    console.error("Logout error:", e);
    next(e);
  }
};