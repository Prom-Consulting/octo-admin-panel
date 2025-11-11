import express from "express";
import { authAdminMiddleware } from "../../../middleware/authAdminMiddleware.ts";
import {
  createOrganization, editOrganization,
  getListOrganizations,
  getOrganizationByID,
} from "../../organization/controllers/organization.controller.ts";

const AdminOrganizations = express.Router();

AdminOrganizations.use(authAdminMiddleware);

AdminOrganizations.get("/",  getListOrganizations);
AdminOrganizations.get("/:id", getOrganizationByID);
AdminOrganizations.post("/", createOrganization);
AdminOrganizations.patch("/", editOrganization);

export default AdminOrganizations;