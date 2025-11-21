import express from "express";
import {
  loginClient,
  logoutClient,
  refreshClientToken,
  registerClientDev,
} from "../controllers/auth.controller.ts";

const ClientAuthServiceRouter = express.Router();

ClientAuthServiceRouter.post("/register-dev", registerClientDev);
// ClientAuthServiceRouter.post("/start-register", startRegister);
ClientAuthServiceRouter.post("/", loginClient);
ClientAuthServiceRouter.post("/refresh", refreshClientToken);
ClientAuthServiceRouter.delete("/logout", logoutClient);

/**
 * @openapi
 * tags:
 *   - name: ClientAuth
 *     description: Client authentication and authorization
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Client:
 *       type: object
 *       description: Client entity
 *       properties:
 *         id:
 *           type: string
 *           description: Unique client ID (generated from calendar/phone/online booking)
 *
 *         first_name:
 *           type: string
 *
 *         last_name:
 *           type: string
 *           nullable: true
 *
 *         password:
 *           type: string
 *           description: Hashed client password
 *
 *         custom_name:
 *           type: string
 *           nullable: true
 *           description: Custom name from integrations
 *
 *         username:
 *           type: string
 *           nullable: true
 *           description: Username from integrations (e.g. Telegram)
 *
 *         phone_number:
 *           type: string
 *
 *         token:
 *           type: string
 *           nullable: true
 *           description: Device access token stored in DB
 *
 *         is_active:
 *           type: boolean
 *
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /clients/auth/register-dev:
 *   post:
 *     tags: [ClientAuth]
 *     summary: Register client (dev mode, without OTP)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ClientRegisterDevRequest"
 *           example:
 *             firstname: "Bob"
 *             lastname: "Y"
 *             phoneNumber: "996707797727"
 *             password: "123"
 *     responses:
 *       200:
 *         description: Client successfully registered
 *         content:
 *           application/json:
 *             example:
 *               client:
 *                 id: "register_1763716405669_RZvMW3biBVr8opUw"
 *                 first_name: "Bob"
 *                 last_name: "Y"
 *                 is_active: true
 *                 updatedAt: "2025-11-21T09:13:25.708Z"
 *                 createdAt: "2025-11-21T09:13:25.672Z"
 *                 custom_name: null
 *                 token: "token"
 *       400:
 *         description: Missing required fields or client exists
 */

/**
 * @openapi
 * /clients/auth:
 *   post:
 *     tags: [ClientAuth]
 *     summary: Login client using phone number and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ClientLoginRequest"
 *           example:
 *             firstname: "Bob"
 *             lastname: "Y"
 *             phoneNumber: "996707797727"
 *             password: "123"
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Client"
 *       400:
 *         description: Invalid phone or password
 */

/**
 * @openapi
 * /clients/auth/refresh:
 *   post:
 *     tags: [ClientAuth]
 *     summary: Refresh client's access token
 *     responses:
 *       200:
 *         description: New access token
 *         content:
 *           application/json:
 *             example:
 *               token: "token"
 *       401:
 *         description: No refresh token provided
 *       404:
 *         description: Client not found
 */

/**
 * @openapi
 * /clients/auth/logout:
 *   delete:
 *     tags: [ClientAuth]
 *     summary: Logout client and clear refresh tokens
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Not authorized or already logged out
 */


export default ClientAuthServiceRouter;