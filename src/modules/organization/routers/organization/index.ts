import express from "express";
import OrganizationClientRouter from "./client.service.ts";
import { authenticateToken } from "../../../../middleware/authorization/authUserMiddleware.ts";
import OrganizationServiceRoute from "./organization.service.ts";

const OrganizationIndexRouter = express.Router();

OrganizationIndexRouter.use(authenticateToken);

OrganizationIndexRouter.use("/clients", OrganizationClientRouter);
OrganizationIndexRouter.use("/", OrganizationServiceRoute);

export default OrganizationIndexRouter;