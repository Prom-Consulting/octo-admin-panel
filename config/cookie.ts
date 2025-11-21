import type { CookieOptions } from "express";

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "none",
  secure: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
