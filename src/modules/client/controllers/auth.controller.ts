import {
  Client, type ClientAttributes,
  generateAccessToken,
  generateClientId,
  generateRefreshToken, verifyAccessToken,
  verifyRefreshToken,
} from "../models/Client.ts";
import bcrypt from "bcrypt";
import type { NextFunction, Request, Response } from "express";
import { refreshCookieOptions } from "../../../../config/cookie.ts";
import { normalizePhone } from "../../../utils /phone/normalizePhone.ts";
import axios from "axios";
import { whatsappSendApi } from "../../../constants/urls.ts";
import { generate6DigitCode } from "../../../utils /phone/sanitizePhone.ts";
import jwt from "jsonwebtoken";

interface OTPEntry {
  phone: string;
  code: string;
  expiresAt: number;
  status:boolean;
}

export const otpStore: OTPEntry[] = [];

export const registerClientDev = async (req:Request, res:Response, next: NextFunction) => {
  try {
    const { firstname, lastname, phoneNumber, password } = req.body;
    const source = "register";

    if (!firstname || !phoneNumber || !password) {
      return res.status(400).json({ error: "First name, phone number and password is required" });
    }

    const existing = await Client.findOne({ where: { phone_number: phoneNumber } });
    if (existing) {
      return res.status(400).json({ message: "Client already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = generateClientId(source);

    const client = await Client.create({
      id,
      first_name: firstname,
      last_name: lastname || null,
      phone_number: normalizePhone(phoneNumber),
      password: hashedPassword,
      is_active: true,
    });

    const accessToken = generateAccessToken(client);
    const refreshToken = generateRefreshToken(client.id);
    await client.update({ token: accessToken });

    const { password: _, phone_number: __, token: ___, ...clientData } = client.toJSON();

    res.cookie("refreshToken", refreshToken, refreshCookieOptions );

    return res.json({
      client: clientData,
      token: accessToken,
    });

  } catch (e) {
    console.error("Register client error", e);
    next(e);
  }
};

export const startRegister = async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) return res.status(400).json({ message: "Phone required" });

  const phone = normalizePhone(phoneNumber);
  const code = generate6DigitCode();

  const expiresAt = Date.now() + 5 * 60 * 1000;

  otpStore.push({ phone, code, expiresAt, status: false });

  await axios.post(whatsappSendApi, {
    accountId: "cmi4fnc3u000qo208kcq09zkx",
    message: `Ваш код подтверждения: ${code}`,
    to: phone,
  });

  return res.json({ message: "Code sent" });
};

export const loginClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phoneNumber, password } = req.body;

    const client = await Client.findOne({ where: { phone_number: phoneNumber }});
    if (!client) {
      return res.status(400).json({ message: "Client not found" });
    }

    const passValid = await bcrypt.compare(password, client.password);
    if (!passValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const accessToken = generateAccessToken(client);
    const refreshToken = generateRefreshToken(client.id);
    await client.update({ token: refreshToken });

    res.cookie("refreshToken", refreshToken, refreshCookieOptions );
    const { password: _, phone_number: __, token: ___, ...clientData } = client.toJSON();

    return res.json({
      client: clientData,
      token: accessToken,
    });

  } catch (e) {
    console.error({ message: "login error" }, e);
    next(e);
  }
};

export const refreshClientToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const payload = verifyRefreshToken(token) as { id: string };
    const client = await Client.findOne({ where: { id: payload.id } });

    if (!client) return res.status(404).json({ error: "Client not found" });

    const accessToken = generateAccessToken(client);
    return res.json({ token: accessToken });

  } catch (e) {
    console.error({ error: "Invalid refresh token client" }, e);
    if (e instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
    if (e instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }
    next(e);
  }
};

export const logoutClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Logout successful" });
    }

    const clientData = verifyAccessToken(token) as ClientAttributes;

    const client = await Client.findOne(
      { where: { id: clientData.id } }
    );

    if (!client) {
      return res.status(401).json({ message: "Logout successful", });
    }

    await client.update({ token: null });

    res.clearCookie("refreshToken", refreshCookieOptions);

    return res.status(200).json({ message: "Logout successful" });
  } catch (e) {
    console.error({error: "logout error client"}, e);
   next(e);
  }
};