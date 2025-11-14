import type { Request } from "express";
import Branch from "../modules/organization/models/Branch.ts";
import Organization from "../modules/organization/models/Organization.ts";

interface GetBranchOrgOptions {
  branch?: boolean;
  organization?: boolean;
  required?: boolean;
}

export const getBranchAndOrganization = async (
  req: Request,
  options: GetBranchOrgOptions = { branch: true, organization: true, required: true }
) => {
  const body = req.body || {};
  const query = req.query || {};

  const branchId = body.branchId ?? query.branchId ?? req.params?.branchId;
  const organizationId = body.organizationId ?? query.organizationId ?? req.params?.organizationId;

  let branch = (req as any).branch || null;
  let organization = (req as any).organization || null;

  if ((options.branch || options.required) && !branch) {
    if (!branchId && options.required) throw { status: 400, message: "branchId is required" };

    if (branchId) {
      branch = await Branch.findByPk(Number(branchId));
      if (!branch && options.required) throw { status: 404, message: "Branch not found" };

      (req as any).branch = branch; // save
    }
  }

  if ((options.organization || options.required) && !organization) {

    const resolvedOrgId =
      organizationId ||
      branch?.organization_id;

    if (!resolvedOrgId && options.required) throw { status: 400, message: "organizationId is required" };

    if (resolvedOrgId) {
      organization = await Organization.findByPk(Number(resolvedOrgId));
      if (!organization && options.required) throw { status: 404, message: "Organization not found" };

      (req as any).organization = organization;
    }
  }

  return { branch, organization };
};