import express from "express";
import OrganizationClientRouter from "./client.service.ts";
import { authenticateToken } from "../../../../middleware/authUserMiddleware.ts";

const OrganizationIndexRouter = express.Router();

OrganizationIndexRouter.use(authenticateToken);

OrganizationIndexRouter.use("/", OrganizationClientRouter);
OrganizationIndexRouter.use("/clients", OrganizationClientRouter);

export default OrganizationIndexRouter;