import type { NextFunction, Request, Response } from "express";
import Organization from "../modules/organization/models/Organization.ts";
import Branch from "../modules/organization/models/Branch.ts";

export const checkOrganizationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user!;

    if (user.role === "admin") return next();

    const orgIdQuery = req.query?.organizationId || req.query?.organization_id;
    const orgIdBody = req.body?.organizationId || req.body?.organization_id;
    const orgIdParams = req.params?.organizationId || req.params?.organization_id;

    if (!orgIdQuery && !orgIdBody && !orgIdParams) {
      return res.status(400).json({
        success: false,
        message: "organizationId is required",
      });
    }

    if (orgIdQuery && orgIdBody && Number(orgIdQuery) !== Number(orgIdBody)) {
      return res.status(400).json({
        success: false,
        message: "organizationId in query and body do not match",
      });
    }

    const organizationId = orgIdBody || orgIdQuery || orgIdParams;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "organizationId is required",
      });
    }

    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    if (user.role === "owner" && organization.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You don't own this organization",
      });
    }

    if ((user.role === "manager" || user.role === "employee") && user.organizationId !== Number(organizationId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not part of this organization",
      });
    }

    req.organization = organization;
    next();
  } catch (err) {
    console.error("checkOrganizationAccess error:", err);
    next(err);
  }
};

export const checkBranchMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user!;

    if (user.role === "admin") return next();

    const branchIdQuery = req.query?.branchId || req.query?.branch_id;
    const branchIdBody = req.body?.branchId || req.body?.branch_id;
    const branchIdParams = req.params?.branchId || req.params?.branch_id;

    if (!branchIdQuery && !branchIdBody && !branchIdParams) {
      return res.status(400).json({
        success: false,
        message: "branchId is required",
      });
    }

    if (branchIdQuery && branchIdBody && Number(branchIdQuery) !== Number(branchIdBody)) {
      return res.status(400).json({
        success: false,
        message: "branchId in query and body do not match",
      });
    }

    const branchId = branchIdBody || branchIdQuery || branchIdParams;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required",
      });
    }

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    if (user.role === "owner") {
      const organization = await Organization.findByPk(branch.organization_id);
      if (!organization || organization.user_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You don't own this branch",
        });
      }
    }

    if (user.role === "manager" || user.role === "employee") {
      const isInBranch = user.branches?.some((b: any) => Number(b.id) === Number(branchId));
      if (!isInBranch) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not assigned to this branch",
        });
      }
    }

    // Сохраняем branch в req
    req.branch = branch;

    next();
  } catch (err) {
    console.error("checkBranchAccess error:", err);
    next(err);
  }
};