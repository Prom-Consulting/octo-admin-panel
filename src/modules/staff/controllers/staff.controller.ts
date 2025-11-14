import type { NextFunction, Request, Response} from "express";
import { ALLOWED_ROLES, type StaffRole } from "../../../constants/roles.ts";
import sequelize from "sequelize/lib/sequelize";
import OrganizationStaff from "../models/OrganizationStaff.ts";
import { Op } from "sequelize";
import { validateBranches } from "../../../methods/methods.ts";
import bcrypt from "bcrypt";
import Branch from "../../organization/models/Branch.ts";
import { getBranchAndOrganization } from "../../../utils /getBranchAndOrganization.ts";

const SALT_ROUNDS = 10;

export const getListStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, role } = req.query;

    if (!organizationId || typeof organizationId !== "string") {
      return res.status(400).json({
        success: false,
        message: "organizationId is required",
      });
    }

    if (role && !ALLOWED_ROLES.includes(role as StaffRole)) {
      return res.status(422).json({
        success: false,
        message: "Invalid role.",
      });
    }

    const whereClause: any = {
      organization: sequelize.literal(
        `organization @> '{"id": ${organizationId}}'`
      ),
    };

    if (role && typeof role === "string") {
      whereClause.role = role as StaffRole;
    }

    const staff = await OrganizationStaff.findAll({
      where: whereClause,
      attributes: { exclude: ["password", "token"] },
    });

    return res.status(200).json({
      success: true,
      data: staff,
      count: staff.length,
    });
  } catch (e) {
    console.error("Error in getStaff:", e);
    next(e);
  }
};

export const getStaffByBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, role } = req.query;
    let { organizationId } = req.query;

    if (!branchId || typeof branchId !== "string") {
      return res.status(400).json({
        success: false,
        message: "branchId is required",
      });
    }

    if (role && !ALLOWED_ROLES.includes(role as StaffRole)) {
      return res.status(422).json({
        success: false,
        message: "Invalid role.",
      });
    }

    const whereClause: any = {
      [Op.and]: [
        sequelize.literal(`branches @> '[{"id": ${branchId}}]'`),
        sequelize.literal(`organization @> '{"id": ${organizationId}}'`),
      ],
    };

    if (role && typeof role === "string") {
      whereClause.role = role as StaffRole;
    }

    const staff = await OrganizationStaff.findAll({
      where: whereClause,
      attributes: { exclude: ["password", "token"] },
    });

    return res.status(200).json({
      success: true,
      data: staff,
      count: staff.length,
    });
  } catch (e) {
    console.error("Error in getStaffByBranch:", e);
    next(e);
  }
};

export const createStaff = async (req: Request, res: Response, next: NextFunction) => {
  const {
    organizationId,
    branches = [],
    firstname,
    lastname,
    username,
    password,
    email,
    role = "employee",
    customRole,
    specialty,
    description,
    isActive = true,
    photoUrl,
  } = req.body;

  try {
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "organizationId is required",
      });
    }

    const { organization } = await getBranchAndOrganization(req, { organization: true });

    if (!firstname || !lastname || !password || !email) {
      return res.status(400).json({
        success: false,
        message: "firstname, lastname, password, and email are required",
      });
    }

    const branchValidation = await validateBranches(branches, organization.id);
    if (!branchValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: branchValidation.message,
      });
    }

    if (role && !ALLOWED_ROLES.includes(role as StaffRole)) {
      return res.status(422).json({
        success: false,
        message: "Invalid role.",
      });
    }

    const existingStaff = await OrganizationStaff.findOne({
      where: { email },
      attributes: ["id", "email"],
    });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newStaff = await OrganizationStaff.create({
      organization: {
        id: organizationId,
        name: organization.name,
      },
      branches: branchValidation.validBranches!,
      first_name: firstname,
      last_name: lastname,
      username,
      password: hashedPassword,
      email,
      role,
      customRole,
      specialty,
      description,
      is_active: isActive,
      photo_url: photoUrl,
    });

    const { password: _, email: __, ...staffData } = newStaff.toJSON();

    return res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: staffData,
    });
  } catch (error) {
    console.error("Error in createStaff:", error);
    next(error);
  }
};

export const updateStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      organization, branches, firstname, lastname, username, password, email,
      role, customRole, specialty, description, isActive, photoUrl
    } = req.body;

    const staff = await OrganizationStaff.findByPk(id, { attributes: { exclude: [] } });
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });

    const targetOrganizationId = organization?.id || staff.organization.id;

    if (branches) {
      const branchValidation = await validateBranches(branches, targetOrganizationId);
      if (!branchValidation.isValid) return res.status(400).json({ success: false, message: branchValidation.message });
    }

    if (role && !ALLOWED_ROLES.includes(role as StaffRole)) {
      return res.status(422).json({ success: false, message: "Invalid role. Must be 'manager' or 'employee'" });
    }

    if (email && email !== staff.email) {
      const existingStaff = await OrganizationStaff.findOne({ where: { email }, attributes: ["id", "email"] });
      if (existingStaff) return res.status(409).json({ success: false, message: "User with this email already exists" });
    }

    const updateData: any = {};
    if (organization) updateData.organization = organization;
    if (branches) updateData.branches = (await validateBranches(branches, targetOrganizationId)).validBranches;
    if (firstname) updateData.first_name = firstname;
    if (lastname) updateData.last_name = lastname;
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (customRole) updateData.customRole = customRole;
    if (specialty) updateData.specialty = specialty;
    if (description) updateData.description = description;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (photoUrl) updateData.photo_url = photoUrl;
    if (password) updateData.password = await bcrypt.hash(password, SALT_ROUNDS);

    await staff.update(updateData);

    const updatedStaff = await OrganizationStaff.findByPk(id, { attributes: { exclude: ["password", "token"] } });

    return res.status(200).json({ success: true, message: "Staff member updated successfully", data: updatedStaff });
  } catch (e) {
    console.error("Error in updateStaff:", e);
    next(e);
  }
};

export const patchStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const staff = await OrganizationStaff.findByPk(id, { attributes: { exclude: [] } });
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });

    const targetOrganizationId = updates.organization?.id || staff.organization.id;

    if (updates.branches) {
      const branchValidation = await validateBranches(updates.branches, targetOrganizationId);
      if (!branchValidation.isValid) return res.status(400).json({ success: false, message: branchValidation.message });
      updates.branches = branchValidation.validBranches;
    }

    if (updates.role && !ALLOWED_ROLES.includes(updates.role as StaffRole)) {
      return res.status(422).json({ success: false, message: "Invalid role. Must be 'manager' or 'employee'" });
    }

    if (updates.email && updates.email !== staff.email) {
      const existingStaff = await OrganizationStaff.findOne({ where: { email: updates.email }, attributes: ["id", "email"] });
      if (existingStaff) return res.status(409).json({ success: false, message: "User with this email already exists" });
    }

    if (updates.password) updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);

    await staff.update(updates);

    const updatedStaff = await OrganizationStaff.findByPk(id, { attributes: { exclude: ["password", "token"] } });

    return res.status(200).json({ success: true, message: "Staff member updated successfully", data: updatedStaff });
  } catch (e) {
    console.error("Error in patchStaff:", e);
    next(e);
  }
};

export const deleteStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const staff = await OrganizationStaff.findByPk(id);
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });

    await staff.destroy();

    return res.status(200).json({ success: true, message: "Staff member deleted successfully" });
  } catch (e) {
    console.error("Error in deleteStaff:", e);
    next(e);
  }
};

export const activateStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const staff = await OrganizationStaff.findByPk(id);
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });

    await staff.update({ is_active: !staff.is_active });

    const updatedStaff = await OrganizationStaff.findByPk(id, { attributes: { exclude: ["password", "token"] } });

    return res.status(200).json({
      success: true,
      message: `Staff member ${staff.is_active ? "activated" : "deactivated"} successfully`,
      data: updatedStaff,
    });
  } catch (e) {
    console.error("Error in activateStaff:", e);
    next(e);
  }
};

export const addBranchToStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { branchId } = req.body;
    if (!branchId) return res.status(400).json({ success: false, message: "branchId is required" });

    const staff = await OrganizationStaff.findByPk(id, { attributes: { exclude: [] } });
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });

    if (staff.branches.some(b => b.id === branchId)) {
      return res.status(400).json({ success: false, message: "Staff member is already assigned to this branch" });
    }

    const branch = await Branch.findOne({ where: { id: branchId, organization_id: staff.organization.id }, attributes: ["id", "name", "address"] });
    if (!branch) return res.status(404).json({ success: false, message: "Branch not found or does not belong to this organization" });

    const updatedBranches = [...staff.branches, { id: branch.id, name: branch.name, address: branch.address }];
    await staff.update({ branches: updatedBranches });

    const updatedStaff = await OrganizationStaff.findByPk(id, { attributes: { exclude: ["password", "token"] } });
    return res.status(200).json({ success: true, message: "Branch added to staff member successfully", data: updatedStaff });
  } catch (e) {
    console.error("Error in addBranchToStaff:", e);
    next(e);
  }
};

export const removeBranchFromStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, branchId } = req.params;
    const branchIdNumber = Number(branchId);
    if (!branchId || isNaN(branchIdNumber) || branchIdNumber <= 0) return res.status(400).json({ success: false, message: "branchId must be a valid positive number" });

    const staff = await OrganizationStaff.findByPk(id, { attributes: { exclude: [] } });
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });

    if (staff.branches.length === 1) return res.status(400).json({ success: false, message: "Cannot remove last branch. Staff member must have at least one branch" });

    if (!staff.branches.some(b => b.id === branchIdNumber)) {
      return res.status(404).json({ success: false, message: "Branch not found in staff member's branches" });
    }

    const updatedBranches = staff.branches.filter(b => b.id !== branchIdNumber);
    await staff.update({ branches: updatedBranches });

    const updatedStaff = await OrganizationStaff.findByPk(id, { attributes: { exclude: ["password", "token"] } });
    return res.status(200).json({ success: true, message: "Branch removed from staff member successfully", data: updatedStaff });
  } catch (e) {
    console.error("Error in removeBranchFromStaff:", e);
    next(e);
  }
};