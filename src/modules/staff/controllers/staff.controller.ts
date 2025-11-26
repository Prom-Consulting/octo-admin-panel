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
    const { organizationId, role, branchId } = req.query;
    const user = req.user;

    if (!organizationId && !branchId) {
      return res.status(400).json({
        success: false,
        message: "organizationId or branchId is required",
      });
    }

    if (role && !ALLOWED_ROLES.includes(role as StaffRole)) {
      return res.status(422).json({
        success: false,
        message: "Invalid role.",
      });
    }

    const whereClause: any = {};

    if (branchId) {
      whereClause.branches = {
        [Op.contains]: [{ id: Number(branchId) }],
      };
    }

    if (organizationId) {
      whereClause.organization = Number(organizationId);
    }

    if (role && typeof role === "string") {
      whereClause.role = role as StaffRole;
    }

    if (!user) whereClause.is_active = true;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);
    const offset = (page - 1) * limit;

    const { rows: staff, count } = await OrganizationStaff.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ["password", "token", "email"] },
      limit,
      offset,
      order: [["createdAt", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
      data: staff,
    });
  } catch (e) {
    console.error("Error in getListStaff:", e);
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
        sequelize.literal(`organization = ${Number(organizationId)}`),
      ],
    };

    if (role && typeof role === "string") {
      whereClause.role = role as StaffRole;
    }

    // --- PAGINATION ---
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);
    const offset = (page - 1) * limit;

    const { rows: staff, count } = await OrganizationStaff.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ["password", "token"] },
      limit,
      offset,
      order: [["createdAt", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
      data: staff,
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
    photo,
    isActive = true,
  } = req.body;

  try {
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "organizationId is required",
      });
    }

    const { organization } = await getBranchAndOrganization(req, { organization: true });

    if (!firstname || !lastname) {
      return res.status(400).json({
        success: false,
        message: "firstname and lastname are required",
      });
    }

    if (role !== "manager") {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "email and password are required for non-manager roles",
        });
      }
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

    if (email) {
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
      photo_url: photo,
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

    const staff = await OrganizationStaff.findByPk(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    const {
      firstname,
      lastname,
      username,
      email,
      role,
      customRole,
      specialty,
      description,
      organizationId,
      branches,
      password,
      photo,
    } = req.body;

    const updates: Record<string, any> = {};

    if (firstname !== undefined) updates.first_name = firstname;
    if (lastname !== undefined) updates.last_name = lastname;
    if (username !== undefined) updates.username = username;
    if (description !== undefined) updates.description = description;
    if (specialty !== undefined) updates.specialty = specialty;
    if (customRole !== undefined) updates.customRole = customRole;
    if (photo !== undefined) updates.photo_url = photo;

    if (role !== undefined) {
      if (!ALLOWED_ROLES.includes(role as StaffRole)) {
        return res.status(422).json({
          success: false,
          message: "Invalid role. Must be 'manager' or 'employee'"
        });
      }
      updates.role = role;
    }

    if (email !== undefined && email !== staff.email) {
      const existing = await OrganizationStaff.findOne({
        where: { email },
        attributes: ["id"]
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      updates.email = email;
    }

    if (password !== undefined) {
      updates.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    if (organizationId !== undefined) {
      updates.organizationId = organizationId;
    }

    if (branches !== undefined) {
      const targetOrgId = organizationId || staff.organization?.id;

      const branchValidation = await validateBranches(branches, targetOrgId);

      if (!branchValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: branchValidation.message,
        });
      }

      updates.branches = branchValidation.validBranches;
    }

    await staff.update(updates);

    const updatedStaff = await OrganizationStaff.findByPk(id, {
      attributes: { exclude: ["password", "token"] }
    });

    return res.status(200).json({
      success: true,
      message: "Staff member updated successfully",
      data: updatedStaff,
    });

  } catch (e) {
    console.error("Error in updateStaff:", e);
    next(e);
  }
};

export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) return res.status(401).json({ error: "Not authorized" });

    const staff = await OrganizationStaff.findByPk(user.id);
    if (!staff) return res.status(404).send("User not found");

    const {
      firstname,
      lastname,
      username,
      email,
      password,
      description,
      specialty,
      photo
    } = req.body;

    const updates: any = {};

    if (firstname !== undefined) updates.first_name = firstname;
    if (lastname !== undefined) updates.last_name = lastname;
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (description !== undefined) updates.description = description;
    if (specialty !== undefined) updates.specialty = specialty;
    if (photo !== undefined) updates.photo_url = photo;

    if (password) {
      updates.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    await staff.update(updates);

    return res.json({ success: true, data: staff });
  } catch (e) {
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