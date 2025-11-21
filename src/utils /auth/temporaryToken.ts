import jwt from "jsonwebtoken";
import { envConfig } from "../../../config/envConfig.ts";

export const temporaryToken = (phone: string) => {
  return jwt.sign({ phone_number: phone, }, envConfig.ONE_TIME_JWT_SECRET, { expiresIn: "5m"});
};

export const verifyTemporaryToken = (token: string) => {
  return jwt.verify(token, envConfig.ONE_TIME_JWT_SECRET);
};

