import express from "express";
import { createImportAssignments } from "../controlers/importJobs.ts";
import { authenticateToken } from "../../../middleware/authorization/authUserMiddleware.ts";
import {
  checkBranchMiddleware,
  checkOrganizationMiddleware,
} from "../../../middleware/authorization/checkOrganizationMiddleware.ts";

const importJobsIndexRoute = express.Router();

importJobsIndexRoute.post("/", authenticateToken, checkBranchMiddleware, checkOrganizationMiddleware,
  createImportAssignments);

export default importJobsIndexRoute;