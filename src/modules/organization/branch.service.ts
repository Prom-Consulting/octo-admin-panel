import express from "express";
import Branch from "./Branch.ts";
import type { WhereOptions } from "sequelize";
import Organization from "./Organization.ts";
import User from "../user/User.ts";

const BranchServiceRoute = express.Router();

BranchServiceRoute.get("/", async (req, res, next) => {
  try {
    const { organizationId, ownerId } = req.query;
    const where: WhereOptions<Branch> = {};

    if (organizationId) {
      where.organization_id = Number(organizationId);
    }
    if (ownerId) {
      where.user_id = Number(ownerId);
    }

    const listBranches = await Branch.findAll({ where });
    return res.send(listBranches);
  } catch (e) {
    console.log(e);
    next(e);
  }
});

BranchServiceRoute.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).send({ error: "Branch not found" });
    }

    return res.send(branch);
  } catch (e) {
    console.log("error: ------------------------------------------------------------------", e);
    next(e);
  }
});

BranchServiceRoute.post("/", async (req, res, next) => {
  try {
    const {
      organizationId,
      name,
      phone,
      address,
      timezone,
      user_id
    } = req.body;

    if (!organizationId || !name || !phone || !address || !timezone) {
      return res
        .status(400)
        .send({ error: " owner_id, name, phone, timezone and address are required" });
    }

    const organization = await Organization.findByPk(organizationId);

    if (!organization) {
      return res.status(400).send({ error: "Organization not found" });
    }

    const branches = await Branch.findAll({
      where: { organization_id: organizationId },
    });

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    const branchLimit = organization.branches ?? 1;

    if (branches.length >= branchLimit) {
      return res.status(400).send({
        error: `Organization has reached its branch limit (${branchLimit})`,
      });
    }

    const currentBranches = await Branch.count({
      where: { organization_id: organizationId },
    });

    if (currentBranches >= organization.branches) {
      return res
        .status(400)
        .send({ error: `User can have only ${organization.branches} branches` });
    }

    const newBranch = await Branch.create({
      organization_id: organizationId,
      name,
      phone,
      address,
      timezone,
      user_id
    });
    return res.send({ message: "Branch created successfully.", newBranch });
  } catch (e) {
    next(e);
  }
});

BranchServiceRoute.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, address } = req.body;

    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).send({ error: "Branch not found" });
    }

    if (name !== undefined) branch.name = name;
    if (phone !== undefined) branch.phone = phone;
    if (address !== undefined) branch.address = address;

    await branch.save();

    return res.send({ message: "Branch updated successfully", branch });
  } catch (e) {
    next(e);
  }
});

BranchServiceRoute.patch("/:id/deactivate", async (req, res, next) => {
  try {
    const { id } = req.params;

    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).send({ error: "Branch not found" });
    }

    if (!branch.isActive) {
      return res.status(401).send({ message: "Permission denied" });
    }

    branch.isActive = false;
    await branch.save();
    return res.send({ message: `You have deactivated the branch: ${branch.name}` });
  } catch (e) {
    next(e);
  }
});

export default BranchServiceRoute;

/**
 * @openapi
 * /branches:
 *   get:
 *     summary: Получить список филиалов
 *     tags:
 *       - Branch
 *     parameters:
 *       - in: query
 *         name: owner
 *         schema:
 *           type: integer
 *         description: ID владельца для фильтрации
 *     responses:
 *       200:
 *         description: Список филиалов
 *         content:
 *           application/json:
 *             example:
 *               - id: 1
 *                 organization_id: 2
 *                 name: "Main Office"
 *                 phone: "+123456789"
 *                 address: "ул. Ленина, 1"
 *                 timezone: "Asia/Bishkek"
 *               - id: 2
 *                 organization_id: 2
 *                 name: "Branch 2"
 *                 phone: "+987654321"
 *                 address: "ул. Советская, 5"
 *                 timezone: "Asia/Bishkek"
 */

/**
 * @openapi
 * /branches/{id}:
 *   get:
 *     summary: Получить филиал по ID
 *     tags:
 *       - Branch
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала
 *     responses:
 *       200:
 *         description: Филиал найден
 *         content:
 *           application/json:
 *             example:
 *               id: 1
 *               organization_id: 2
 *               name: "Main Office"
 *               phone: "+123456789"
 *               address: "ул. Ленина, 1"
 *               timezone: "Asia/Bishkek"
 *       404:
 *         description: Branch not found
 */

/**
 * @openapi
 * /branches:
 *   post:
 *     summary: Создать филиал
 *     tags:
 *       - Branch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             organizationId: 2
 *             name: "New Branch"
 *             phone: "+777777777"
 *             address: "ул. Победы, 10"
 *             timezone: "Asia/Bishkek"
 *     responses:
 *       200:
 *         description: Branch created
 *         content:
 *           application/json:
 *             example:
 *               message: "Branch created successfully."
 *               newBranch:
 *                 id: 3
 *                 organization_id: 2
 *                 name: "New Branch"
 *                 phone: "+777777777"
 *                 address: "ул. Победы, 10"
 *                 timezone: "Asia/Bishkek"
 *       400:
 *         description: Ошибка валидации
 */

/**
 * @openapi
 * /branches/{id}:
 *   patch:
 *     summary: Обновить филиал
 *     tags:
 *       - Branch
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: "Updated Branch"
 *             phone: "+111111111"
 *             address: "ул. Гагарина, 25"
 *             timezone: "Asia/Bishkek"
 *     responses:
 *       200:
 *         description: Branch обновлён
 *         content:
 *           application/json:
 *             example:
 *               message: "Branch updated successfully"
 *               branch:
 *                 id: 1
 *                 organization_id: 2
 *                 name: "Updated Branch"
 *                 phone: "+111111111"
 *                 address: "ул. Гагарина, 25"
 *                 timezone: "Asia/Bishkek"
 *       404:
 *         description: Branch not found
 */

/**
 * @openapi
 * /branches/{id}/deactivate:
 *   patch:
 *     summary: Деактивировать филиал
 *     tags:
 *       - Branch
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID филиала
 *     responses:
 *       200:
 *         description: Филиал деактивирован
 *         content:
 *           application/json:
 *             example:
 *               message: "You have deactivated the branch: Main Office"
 *       404:
 *         description: Branch not found
 *       401:
 *         description: Permission denied
 */
