import { cleanEnv, str } from "envalid";

export const envConfig = cleanEnv(process.env, {
  CLIENT_API_URL: str(),
  ADMIN_PANEL_URL: str(),
  JWT_SECRET: str(),
});