import express from "express";
import { getListOrganizations, getOrganizationByID } from "../controllers/organization.controller.ts";
import { authenticateToken, authorizeRoles } from "../../../middleware/authUserMiddleware.ts";

const OrganizationServiceRoute = express.Router();
OrganizationServiceRoute.use(authenticateToken, authorizeRoles("owner"));

OrganizationServiceRoute.get("/", getListOrganizations);

OrganizationServiceRoute.get("/:id", getOrganizationByID);

// OrganizationServiceRoute.post("/", async (req, res, next) => {
//   try {
//     const { name, branches, paidDate, userId } = req.body;
//
//     if (!paidDate || !name || !branches || !userId) {
//       return res.status(400).send({ error: "Inputs required" });
//     }
//
//     const existingOrganization = await Organization.findOne({
//       where: { name },
//     });
//
//     const existingUser = await User.findByPk(userId);
//
//     if (existingOrganization) {
//       return res.status(400).send({ error: "Organization already exists" });
//     }
//
//     if (!existingUser) {
//       return res.status(400).send({ error: "The user does not exist" });
//     }
//
//     const organization: OrganizationCreate = {
//       name: name,
//       user_id: Number(userId),
//       branches,
//       paidDate: paidDate,
//       isActive: true,
//     };
//
//     const result = await createClientDatabase(organization);
//
//     if (result === 0) {
//       const newOrganization = await Organization.create(organization);
//
//       return res.status(201).json({
//         newOrganization,
//       });
//     } else {
//       return res.status(500).send({
//         error: "Database issue",
//       });
//     }
//   } catch (e) {
//     console.log("Create organization error",e);
//     next(e);
//   }
// });
//
// OrganizationServiceRoute.patch("/:id", async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { name, branches, paidDate, isActive } = req.body;
//
//     const organization = await Organization.findByPk(id);
//     if (!organization) {
//       return res.status(404).json({ message: "Organization not found" });
//     }
//
//     if (name !== undefined) organization.name = name;
//     if (branches !== undefined) organization.branches = branches;
//     if (paidDate !== undefined) organization.paidDate = new Date(paidDate);
//     if (isActive !== undefined) organization.isActive = isActive;
//
//     await organization.save();
//
//     res.send(organization);
//   } catch (e) {
//     console.log("Edit organization error", e);
//     next(e);
//   }
// });

export default OrganizationServiceRoute;

/**
 * @swagger
 * tags:
 *   name: Organizations
 *   description: Работа с организациями
 */

/**
 * @swagger
 * /organizations/:
 *   get:
 *     summary: Получить список организаций, можно фильтровать по ownerId
 *     tags: [Organizations]
 *     parameters:
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: integer
 *         description: ID владельца организации
 *     responses:
 *       200:
 *         description: Список организаций
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Organization'
 *
 *   post:
 *     summary: Создать новую организацию
 *     tags: [Organizations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - branches
 *               - paidDate
 *               - userId
 *             properties:
 *               name:
 *                 type: string
 *               branches:
 *                 type: integer
 *               paidDate:
 *                 type: string
 *                 format: date
 *               userId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Организация успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 newOrganization:
 *                   $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Ошибка валидации
 *       500:
 *         description: Проблема с базой данных
 */

/**
 * @swagger
 * /organizations/{id}:
 *   get:
 *     summary: Получить организацию по ID
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Информация об организации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organization'
 *       404:
 *         description: Организация не найдена
 *
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Organization:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         user_id:
 *           type: integer
 *         branches:
 *           type: integer
 *         paidDate:
 *           type: string
 *           format: date
 *         isActive:
 *           type: boolean
 */
