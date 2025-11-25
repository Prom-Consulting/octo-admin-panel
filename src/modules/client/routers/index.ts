import express from "express";
import ClientAuthServiceRouter from "./auth.service.ts";
import ClientServiceRouter from "./client.service.ts";
import ClientAssigmentRoute from "./assignment.service.ts";
import { authClientMiddleware } from "../../../middleware/authClientMiddlware.ts";

const ClientIndexRouter = express.Router();

ClientIndexRouter.use("/auth", ClientAuthServiceRouter );

ClientIndexRouter.use(authClientMiddleware);
ClientIndexRouter.use("/me", ClientServiceRouter);
ClientIndexRouter.use("/assignments", ClientAssigmentRoute);

export default ClientIndexRouter;