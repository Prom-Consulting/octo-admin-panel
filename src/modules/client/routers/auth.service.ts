import express from "express";
import { loginClient, logoutClient, refreshClientToken, registerClient } from "../controllers/auth.controller.ts";

const ClientAuthServiceRouter = express.Router();

ClientAuthServiceRouter.post("/register", registerClient);
ClientAuthServiceRouter.post("/", loginClient);
ClientAuthServiceRouter.post("/refresh", refreshClientToken);
ClientAuthServiceRouter.delete("/logout", logoutClient);

export default ClientAuthServiceRouter;