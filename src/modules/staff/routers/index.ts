import { Router } from "express";
import OrganizationStaffRouter from "./staff.service.ts";
import { authenticateToken } from "../../../middleware/authUserMiddleware.ts";

const StaffRouter = Router();

StaffRouter.use(authenticateToken);
StaffRouter.use("/", OrganizationStaffRouter);

export default StaffRouter;