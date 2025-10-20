import { Router } from "express";
import type { Response, Request, NextFunction } from "express";
import OrganizationStaff from "../models/OrganizationStaff.ts";
import { sequelize } from "../dbConfig/dbConfig.ts";
import { Op } from "sequelize";
import { ALLOWED_ROLES, type StaffRole } from "../constants/roles.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validateBranches } from "../methods/methods.ts";
import Branch from "../models/Branch.ts";
import {
  authenticateToken,
  authorizeRoles,
  checkOrganizationAccess,
} from "../middleware/authStaffMiddleware.ts";
import { envConfig } from "../../config/envConfig.ts";

const JWT_SECRET = envConfig.JWT_SECRET!;
const SALT_ROUNDS = 10;

const OrganizationStaffRouter = Router();

// Все роуты защищены авторизацией
// OrganizationStaffRouter.use(authenticateToken);

// Получение всех сотрудников организации
OrganizationStaffRouter.get(
  "/",
  checkOrganizationAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, role } = req.query;

      if (!organizationId || typeof organizationId !== "string") {
        return res.status(400).json({
          success: false,
          message: "organizationId is required",
        });
      }

      // Валидация роли, если она указана
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

      // Добавляем роль только если она указана
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
  }
);

// Получение сотрудников по филиалу
OrganizationStaffRouter.get(
  "/byBranch",
  checkOrganizationAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { branchId, organizationId, role } = req.query;

      if (
        !branchId ||
        !organizationId ||
        typeof branchId !== "string" ||
        typeof organizationId !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "branchId and organizationId are required",
        });
      }

      // Валидация роли, если она указана
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

      // Добавляем роль только если она указана
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
  }
);

// Создание нового сотрудника (только для manage and owner)
OrganizationStaffRouter.post(
  "/",
  // authorizeRoles("manager", "owner"),
  // checkOrganizationAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        organization,
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
        is_active = true,
        photo_url,
      } = req.body;

      // Валидация обязательных полей
      if (!organization || !organization.id) {
        return res.status(400).json({
          success: false,
          message: "organization with id is required",
        });
      }

      if (!firstname || !lastname || !password || !email) {
        return res.status(400).json({
          success: false,
          message: "firstname, lastname, password, and email are required",
        });
      }

      // Валидация филиалов
      const branchValidation = await validateBranches(branches, organization.id);

      if (!branchValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: branchValidation.message,
        });
      }

      // Валидация роли
      if (role && !ALLOWED_ROLES.includes(role as StaffRole)) {
        return res.status(422).json({
          success: false,
          message: "Invalid role.",
        });
      }

      // Проверка существования email
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

      // Хеширование пароля
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Создание токена
      const token = jwt.sign(
        { email, role, organizationId: organization.id },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      // Создание сотрудника с валидированными филиалами
      const newStaff = await OrganizationStaff.create({
        organization,
        branches: branchValidation.validBranches!,
        firstname,
        lastname,
        username,
        password: hashedPassword,
        email,
        token,
        role,
        customRole,
        specialty,
        description,
        is_active,
        photo_url,
      });

      // Возвращаем сотрудника без пароля
      const staffData = newStaff.toJSON();

      return res.status(201).json({
        success: true,
        message: "Staff member created successfully",
        data: staffData,
      });
    } catch (e) {
      console.error("Error in createStaff:", e);
      next(e);
    }
  }
);

// Обновление сотрудника (только для manager)
OrganizationStaffRouter.put(
  "/:id",
  authorizeRoles("manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const {
        organization,
        branches,
        firstname,
        lastname,
        username,
        password,
        email,
        role,
        customRole,
        specialty,
        description,
        is_active,
        photo_url,
      } = req.body;

      // Проверка существования сотрудника
      const staff = await OrganizationStaff.findByPk(id, {
        attributes: { exclude: [] },
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found",
        });
      }

      // Проверка доступа к организации
      if (req.user && staff.organization.id !== req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Staff member belongs to another organization",
        });
      }

      // Валидация organization если он указан
      const targetOrganizationId = organization?.id || staff.organization.id;

      // Валидация филиалов если они указаны
      if (branches) {
        const branchValidation = await validateBranches(
          branches,
          targetOrganizationId
        );

        if (!branchValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: branchValidation.message,
          });
        }
      }

      // Валидация роли если она указана
      if (role && !ALLOWED_ROLES.includes(role as StaffRole)) {
        return res.status(422).json({
          success: false,
          message: "Invalid role. Must be 'manager' or 'employee'",
        });
      }

      // Проверка email на уникальность (если email изменяется)
      if (email && email !== staff.email) {
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

      // Подготовка объекта обновления
      const updateData: any = {};

      if (organization !== undefined) updateData.organization = organization;
      if (branches !== undefined) {
        const branchValidation = await validateBranches(
          branches,
          targetOrganizationId
        );
        updateData.branches = branchValidation.validBranches;
      }
      if (firstname !== undefined) updateData.firstname = firstname;
      if (lastname !== undefined) updateData.lastname = lastname;
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (customRole !== undefined) updateData.customRole = customRole;
      if (specialty !== undefined) updateData.specialty = specialty;
      if (description !== undefined) updateData.description = description;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (photo_url !== undefined) updateData.photo_url = photo_url;

      // Хеширование нового пароля если он указан
      if (password) {
        updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
      }

      // Обновление сотрудника
      await staff.update(updateData);

      // Возвращаем обновленные данные без пароля
      const updatedStaff = await OrganizationStaff.findByPk(id, {
        attributes: { exclude: ["password", "token"] },
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
  }
);

// Частичное обновление сотрудника (manager или сам сотрудник)
OrganizationStaffRouter.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Проверка существования сотрудника
      const staff = await OrganizationStaff.findByPk(id, {
        attributes: { exclude: [] },
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found",
        });
      }

      // Проверка прав доступа
      const isManager = req.user?.role === "manager";
      const isOwnProfile = req.user?.id === staff.id;

      if (!isManager && !isOwnProfile) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Проверка организации
      if (req.user && staff.organization.id !== req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Обычные сотрудники не могут изменять роль, организацию, филиалы
      if (!isManager && (updates.role || updates.organization || updates.branches)) {
        return res.status(403).json({
          success: false,
          message: "Only managers can modify role, organization or branches",
        });
      }

      // Определяем organizationId для валидации филиалов
      const targetOrganizationId = updates.organization?.id || staff.organization.id;

      // Валидация филиалов если они указаны
      if (updates.branches) {
        const branchValidation = await validateBranches(
          updates.branches,
          targetOrganizationId
        );

        if (!branchValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: branchValidation.message,
          });
        }

        updates.branches = branchValidation.validBranches;
      }

      // Валидация роли если она указана
      if (updates.role && !ALLOWED_ROLES.includes(updates.role as StaffRole)) {
        return res.status(422).json({
          success: false,
          message: "Invalid role. Must be 'manager' or 'employee'",
        });
      }

      // Проверка email на уникальность
      if (updates.email && updates.email !== staff.email) {
        const existingStaff = await OrganizationStaff.findOne({
          where: { email: updates.email },
          attributes: ["id", "email"],
        });

        if (existingStaff) {
          return res.status(409).json({
            success: false,
            message: "User with this email already exists",
          });
        }
      }

      // Хеширование пароля если он указан
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
      }

      // Обновление
      await staff.update(updates);

      // Возвращаем обновленные данные
      const updatedStaff = await OrganizationStaff.findByPk(id, {
        attributes: { exclude: ["password", "token"] },
      });

      return res.status(200).json({
        success: true,
        message: "Staff member updated successfully",
        data: updatedStaff,
      });
    } catch (e) {
      console.error("Error in patchStaff:", e);
      next(e);
    }
  }
);

// Удаление сотрудника (только для manager)
OrganizationStaffRouter.delete(
  "/:id",
  authorizeRoles("manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const staff = await OrganizationStaff.findByPk(id);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found",
        });
      }

      // Проверка организации
      if (req.user && staff.organization.id !== req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      await staff.destroy();

      return res.status(200).json({
        success: true,
        message: "Staff member deleted successfully",
      });
    } catch (e) {
      console.error("Error in deleteStaff:", e);
      next(e);
    }
  }
);

// Активация и деактивация сотрудника (только для manager)
OrganizationStaffRouter.patch(
  "/:id/de-activate",
  authorizeRoles("manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const staff = await OrganizationStaff.findByPk(id);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found",
        });
      }

      // Проверка организации
      if (req.user && staff.organization.id !== req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      await staff.update({ is_active: !staff.is_active });

      const updatedStaff = await OrganizationStaff.findByPk(id, {
        attributes: { exclude: ["password", "token"] },
      });

      return res.status(200).json({
        success: true,
        message: `Staff member ${staff.is_active ? "activated" : "deactivated"} successfully`,
        data: updatedStaff,
      });
    } catch (e) {
      console.error("Error in activateStaff:", e);
      next(e);
    }
  }
);

// Добавление сотрудника к филиалу (только для manager)
OrganizationStaffRouter.post(
  "/:id/branches",
  authorizeRoles("manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { branchId } = req.body;

      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: "branchId is required",
        });
      }

      const staff = await OrganizationStaff.findByPk(id, {
        attributes: { exclude: [] },
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found",
        });
      }

      // Проверка организации
      if (req.user && staff.organization.id !== req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Проверяем, не добавлен ли уже этот филиал
      const branchExists = staff.branches.some((b) => b.id === branchId);

      if (branchExists) {
        return res.status(400).json({
          success: false,
          message: "Staff member is already assigned to this branch",
        });
      }

      // Проверяем существование филиала
      const branch = await Branch.findOne({
        where: {
          id: branchId,
          organization_id: staff.organization.id,
        },
        attributes: ["id", "name", "address"],
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found or does not belong to this organization",
        });
      }

      // Добавляем филиал
      const updatedBranches = [
        ...staff.branches,
        {
          id: branch.id,
          name: branch.name,
          address: branch.address,
        },
      ];

      await staff.update({ branches: updatedBranches });

      const updatedStaff = await OrganizationStaff.findByPk(id, {
        attributes: { exclude: ["password", "token"] },
      });

      return res.status(200).json({
        success: true,
        message: "Branch added to staff member successfully",
        data: updatedStaff,
      });
    } catch (e) {
      console.error("Error in addBranchToStaff:", e);
      next(e);
    }
  }
);

// Удаление сотрудника из филиала (только для manager)
OrganizationStaffRouter.delete(
  "/:id/branches/:branchId",
  authorizeRoles("manager"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, branchId } = req.params;

      // Валидация id сотрудника
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({
          success: false,
          message: "Staff id is invalid",
        });
      }

      // Валидация branchId
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: "branchId is required",
        });
      }

      if (typeof branchId !== "string" || isNaN(Number(branchId))) {
        return res.status(400).json({
          success: false,
          message: "branchId must be a valid number",
        });
      }

      const branchIdNumber = Number(branchId);

      if (branchIdNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: "branchId must be a positive number",
        });
      }

      const staff = await OrganizationStaff.findByPk(id, {
        attributes: { exclude: [] },
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found",
        });
      }

      // Проверка организации
      if (req.user && staff.organization.id !== req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Проверяем, что это не последний филиал
      if (staff.branches.length === 1) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot remove last branch. Staff member must have at least one branch",
        });
      }

      // Проверяем наличие филиала у сотрудника
      const branchExists = staff.branches.some((b) => b.id === branchIdNumber);

      if (!branchExists) {
        return res.status(404).json({
          success: false,
          message: "Branch not found in staff member's branches",
        });
      }

      // Удаляем филиал
      const updatedBranches = staff.branches.filter((b) => b.id !== branchIdNumber);

      await staff.update({ branches: updatedBranches });

      const updatedStaff = await OrganizationStaff.findByPk(id, {
        attributes: { exclude: ["password", "token"] },
      });

      return res.status(200).json({
        success: true,
        message: "Branch removed from staff member successfully",
        data: updatedStaff,
      });
    } catch (e) {
      console.error("Error in removeBranchFromStaff:", e);
      next(e);
    }
  }
);

export default OrganizationStaffRouter;
