import express from "express";
import {
  createBranch,
  getBranchById,
  getBranches,
  updateBranch,
} from "../../organization/controllers/branch.controllers.ts";

const AdminBranchesService = express.Router();

AdminBranchesService.get("/", getBranches);
AdminBranchesService.get("/:id", getBranchById);
AdminBranchesService.post("/", createBranch);
AdminBranchesService.patch("/:id", updateBranch);

export default AdminBranchesService;