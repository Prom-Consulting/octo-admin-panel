import type { NextFunction, Request, Response } from "express";
import { Op, type WhereOptions } from "sequelize";
import Branch from "../models/Branch.ts";
import Organization from "../models/Organization.ts";
import { getBranchAndOrganization } from "../../../utils /auth/getBranchAndOrganization.ts";

export const getBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, name } = req.query;
    const user = req.user;
    const where: WhereOptions = {};

    if (user && (user.role === "admin" || user.role === "owner")) {
      if (organizationId) where.organization_id = Number(organizationId);

    } else if (user && (user.role === "manager" || user.role === "employee")) {
      const branchIds = user.branches?.map((b: any) => b.id);
      if (!branchIds?.length) return res.status(200).send([]);
      where.id = branchIds;
    } else {
      where.isActive = true;
    }

    if (name) where.name = { [Op.iLike]: `%${name}%` };

    const listBranches = await Branch.findAll({ where });
    return res.send(listBranches);

  } catch (e) {
    console.log("Get branch error", e);
    next(e);
  }
};

export const getBranchById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { branch } = await getBranchAndOrganization(req, { branch: true });

    if (!branch) return res.status(404).send({ error: "Branch not found" });

    if (user && user.role === "admin") {
      return res.send(branch);
    }

    if (user && user.role === "owner") {
      const organization = await Organization.findByPk(branch.organization_id);
      if (!organization || organization.user_id !== user.id) {
        return res.status(403).send({ error: "Access denied" });
      }
      return res.send(branch);
    }

    if (branch.isActive) {
      return res.send(branch);
    } else {
      return res.status(403).send({ error: "Branch not active" });
    }

  } catch (e) {
    console.log("Get by id branch error", e);
    next(e);
  }
};

export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, name, phone, address, timezone } = req.body;

    if (!organizationId || !name || !phone || !address || !timezone) {
      return res
        .status(400)
        .send({ error: "organizationId, name, phone, timezone and address are required" });
    }

    const organization = await Organization.findByPk(organizationId);

    if (!organization) return res.status(400).send({ error: "Organization not found" });

    const branches = await Branch.findAll({ where: { organization_id: organizationId } });
    const branchLimit = organization.branches ?? 1;

    if (branches.length >= branchLimit) {
      return res
        .status(400)
        .send({ error: `Organization has reached its branch limit (${branchLimit})` });
    }

    const newBranch = await Branch.create({
      organization_id: organizationId,
      name,
      phone,
      address,
      timezone,
    });

    return res.send({ message: "Branch created successfully.", newBranch });
  } catch (e) {
    console.log("Create branch error", e);
    next(e);
  }
};

export const updateBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.params;
    const { name, phone, address, isActive } = req.body;
    const user = req.user;

    if (!user) return res.status(401).json({ error: "Not authorized" });

    const branch = await Branch.findByPk(branchId);
    if (!branch) return res.status(404).send({ error: "Branch not found" });

    const organization = await Organization.findByPk(branch.organization_id);

    if (user.role !== "admin") {
      if (!organization || organization.user_id !== user.id) {
        return res.status(403).send({ error: "Access denied" });
      }
    }

    if (user.role === "admin") {
      if (name !== undefined) branch.name = name;
      if (phone !== undefined) branch.phone = phone;
      if (address !== undefined) branch.address = address;
      if (isActive !== undefined) branch.isActive = isActive;
    }

    else if (user.role === "owner") {
      if (name !== undefined) branch.name = name;
      if (phone !== undefined) branch.phone = phone;
      if (address !== undefined) branch.address = address;

      else if (isActive === true)
        return res
          .status(403)
          .send({ error: "Owners cannot activate branches manually" });
    }

    await branch.save();

    return res.send({ message: "Branch updated successfully", branch });
  } catch (e) {
    console.log("Patch branch error", e);
    next(e);
  }
};

export const deactivateBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.params;
    const user = req.user;

    if (!user) return res.status(401).json({ error: "Not authorized" });

    const branch = await Branch.findByPk(branchId);
    if (!branch) return res.status(404).send({ error: "Branch not found" });

    if (!branch.isActive) {
      return res.status(400).send({ message: "Branch already deactivated" });
    }

    branch.isActive = false;
    await branch.save();

    return res.send({ message: `You have deactivated the branch: ${branch.name}` });
  } catch (e) {
    console.log("Patch branch deactivate error", e);
    next(e);
  }
};

export const getBranchWithOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    const { branch } = await getBranchAndOrganization(req, { branch: true });

    if (!user) return res.status(401).json({ error: "Not authorized" });
    if (!branch) return res.status(400).json({ error: "Invalid branch id" });

    if (user.role === "manager" || user.role === "employee") {
      const allowedBranchIds = user.branches?.map((b: any) => b.id) || [];
      if (!allowedBranchIds.includes(branch.id)) {
        return res.status(403).json({ error: "Access denied to this branch" });
      }
    }

    const branchData = await Branch.findOne({
      where: { id: branch.id },
      include: [
        {
          model: Organization,
          as: "organization",
        },
      ],
    });

    if (!branchData) return res.status(404).json({ error: "Branch not found" });

    return res.json(branchData);
  } catch (e) {
    console.error("Get branch + org error:", e);
    next(e);
  }
};
