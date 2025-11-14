import type { Request } from "express";
import Branch from "../modules/organization/models/Branch.ts";
import Organization from "../modules/organization/models/Organization.ts";

interface GetBranchOrgOptions {
  branch?: boolean;         // искать филиал
  organization?: boolean;   // искать организацию
  required?: boolean;       // если true — бросать ошибку при отсутствии id
}

export const getBranchAndOrganization = async (
  req: Request,
  options: GetBranchOrgOptions = { branch: true, organization: true, required: true }
) => {
  const body = req.body || {};
  const query = req.query || {};

  const branchId = body.branchId ?? query.branchId;
  const organizationId = body.organizationId ?? query.organizationId;

  let branch = (req as any).branch;
  let organization = (req as any).organization;

  if (options.branch || options.required) {
    if (!branch && branchId) {
      branch = await Branch.findByPk(Number(branchId));
      console.log(branch);
    }

    if (!branch && options.required) {
      throw { status: 404, message: "Branch not found" };
    }
  }

  if (options.organization || options.required) {
    if (!organization && organizationId) {
      organization = await Organization.findByPk(Number(organizationId));
    }

    if (!organization && options.required) {
      throw { status: 404, message: "Organization not found" };
    }
  }

  return { branch, organization };
};