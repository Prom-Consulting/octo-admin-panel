import type { NextFunction, Request, Response } from "express";
import type { WhereOptions } from "sequelize";
import Organization from "../model/Organization.ts";
import User from "../../user/User.ts";
import { createClientDatabase } from "../../../methods/octo_database.ts";
import type { OrganizationCreate } from "../../../types";

export const getListOrganizations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { ownerId } = req.query;
    const user = req.user;
    const where: WhereOptions = {};

    if (!user) return res.status(401).json({ error: "Not authorized" });

    if (user.role === "admin") {
      if (ownerId) where.user_id = Number(ownerId);
    } else if (user.role === "owner") {
      where.user_id = user.id;
    }

    const organizationList = await Organization.findAll({ where });
    res.send(organizationList);
  } catch (e) {
    console.log("Get organization error", e);
    next(e);
  }
};

export const getOrganizationByID = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Not authorized" });

    const organization = await Organization.findByPk(id);

    if (!organization) {
      return res.status(404).send({ error: "Organization not found" });
    }


    if (user.role !== "admin" && organization.user_id !== user.id) {
      return res.status(403).send({ error: "Access denied" });
    }

    res.send(organization);
  } catch (e) {
    console.log("Get by id organization error", e);
    next(e);
  }
};

export const createOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, branches, paidDate, userId } = req.body;

    if (!paidDate || !name || !branches || !userId) {
      return res.status(400).send({ error: "Inputs required" });
    }

    const existingOrganization = await Organization.findOne({
      where: { name },
    });

    const existingUser = await User.findByPk(userId);

    if (existingOrganization) {
      return res.status(400).send({ error: "Organization already exists" });
    }

    if (!existingUser) {
      return res.status(400).send({ error: "The user does not exist" });
    }

    const organization: OrganizationCreate = {
      name: name,
      user_id: Number(userId),
      branches,
      paidDate: paidDate,
      isActive: true,
    };

    const result = await createClientDatabase(organization);

    if (result === 0) {
      const newOrganization = await Organization.create(organization);

      return res.status(201).json({
        newOrganization,
      });
    } else {
      return res.status(500).send({
        error: "Database issue",
      });
    }
  } catch (e) {
    console.log("Create organization error",e);
    next(e);
  }
}

export const editOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { branches, paidDate, isActive } = req.body;

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    if (branches !== undefined) organization.branches = branches;
    if (paidDate !== undefined) organization.paidDate = new Date(paidDate);
    if (isActive !== undefined) organization.isActive = isActive;

    await organization.save();

    res.send(organization);
  } catch (e) {
    console.log("Edit organization error", e);
    next(e);
  }
}