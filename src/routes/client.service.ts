import express from "express";
import ClientActivity from "../models/ClientActivity.ts";
import { nanoid } from "nanoid";
import Branch from "../models/Branch.ts";
import Client from "../models/Client.ts";
import Organization from "../models/Organization.ts";
import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { envConfig } from "../../config/envConfig.ts";

const ClientServiceRouter = express.Router();

//фильтрация по источнику
ClientServiceRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clients = await Client.findAll();
      const clientsActivity = await ClientActivity.findAll();
      return res.send({
        clients,
        clientsActivity,
      });
    } catch (e) {
      next(e);
    }
  }
);

// API для добавления клиента + создание активности клиента
ClientServiceRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        first_name,
        last_name,
        phone_number,
        branch_id,
        source,
        password,
        organizationId,
      } = req.body;

      if (!first_name || !phone_number || !branch_id) {
        return res.status(400).json({ message: "Required fields are missing" });
      }

      const existingClient = await Client.findOne({
        where: { phone_number },
      });

      const existingBranch = await Branch.findByPk(branch_id);
      const existingOrg = await Organization.findByPk(organizationId);

      if (existingClient) {
        return res.status(400).json({ message: "Client already exists" });
      }

      if (!existingBranch) {
        return res.status(400).json({ message: "Branch  not found" });
      }

      if (!existingOrg) {
        return res.status(400).json({ message: "Organization not found" });
      }

      const source_id = `${source}_${Date.now()}_${nanoid(6)}`;
      const hashedPassword = await bcrypt.hash(password, 10);

      const client = await Client.create({
        first_name,
        last_name: last_name || null,
        phone_number: phone_number.trim(),
        password: hashedPassword,
        source_id,
        is_active: true,
      });

      const clientActivity = await ClientActivity.create({
        client_id: client.id,
        branch_id,
        service_id: 1,
      });

      console.log(clientActivity);

      return res.send({
        message: "Client added successfully",
        client,
      });
    } catch (e) {
      console.log("Error: " + e);

      next(e);
    }
  }
);

ClientServiceRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { phone_number, password } = req.body;

    const client = await Client.findOne({ where: { phone_number } });

    if (!client) {
      return res.status(400).json({ message: "Client not found" });
    }

    const isValid = await bcrypt.compare(password, client.password);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: client.id, phone: client.phone_number },
      envConfig.JWT_SECRET!,
      { expiresIn: "365d" }
    );

    return res.json({ message: "Login successful", token });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

ClientServiceRouter.get(
  "/getClientBySource",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clients = await Client.findAll({
        where: { source_id: req.headers.source_id },
      });

      return res.send({ message: "Success", data: clients });
    } catch (e) {
      console.error("Error:" + e);

      next(e);
    }
  }
);

// API для активации/диактивации клиента
ClientServiceRouter.patch(
  "/:id/activate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      let { is_active } = req.body;

      if (typeof is_active === "string") {
        is_active = is_active.toLowerCase() === "true";
      }

      const client = await Client.findByPk(id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (is_active === client.is_active) {
        return res.status(400).json({
          message: `Client is already ${is_active ? "active" : "inactive"}`,
        });
      }

      client.is_active = is_active;
      await client.save();

      return res.json({
        message: `Client ${client.first_name} ${client.last_name ?? ""} ${is_active ? "activated" : "deactivated"}`,
      });
    } catch (e) {
      next(e);
    }
  }
);

//API для обновления/создания активности клиента
ClientServiceRouter.patch(
  "/:id/last-activity",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = Number(req.params.id);
      const { branch_id, service_id } = req.body;

      if (!branch_id || !service_id) {
        return res
          .status(400)
          .send({ message: "branch_id and service_name are required" });
      }

      const existingBranch = await Branch.findByPk(branch_id);
      if (!existingBranch) {
        return res.status(404).send({ error: "Branch not found" });
      }

      const lastActivity = await ClientActivity.findOne({
        where: { client_id: clientId, branch_id },
        order: [["last_active_at", "DESC"]],
      });

      if (lastActivity) {
        lastActivity.service_id = service_id;
        await lastActivity.save();
      } else {
        await ClientActivity.create({
          client_id: clientId,
          branch_id,
          service_id,
        });
      }

      return res.send({ message: "Client activity updated successfully" });
    } catch (e) {
      console.log(e);
      next(e);
    }
  }
);

ClientServiceRouter.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { first_name, last_name, custom_name } = req.body;

      const client = await Client.findByPk(id);

      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // обновляем только те поля, которые пришли
      if (first_name !== undefined) client.first_name = first_name;
      if (last_name !== undefined) client.last_name = last_name;
      if (custom_name !== undefined) client.custom_name = custom_name;

      await client.save();

      return res.json({
        message: "Client updated successfully",
        client,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default ClientServiceRouter;

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Работа с клиентами и их активностью
 */

/**
 * @swagger
 * /clients/:
 *   get:
 *     summary: Получить всех клиентов и их активность
 *     tags: [Clients]
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Client'
 *                 clientsActivity:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ClientActivity'
 *
 *   post:
 *     summary: Добавить клиента и создать его активность
 *     tags: [Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - phone_number
 *               - branch_id
 *               - password
 *               - organizationId
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               branch_id:
 *                 type: integer
 *               source:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Клиент успешно добавлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 client:
 *                   $ref: '#/components/schemas/Client'
 */

/**
 * @swagger
 * /clients/login:
 *   post:
 *     summary: Логин клиента
 *     tags: [Clients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *               - password
 *             properties:
 *               phone_number:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 */

/**
 * @swagger
 * /clients/getClientBySource:
 *   get:
 *     summary: Получить клиентов по source_id
 *     tags: [Clients]
 *     parameters:
 *       - in: header
 *         name: source_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успешно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Client'
 */

/**
 * @swagger
 * /clients/{id}/activate:
 *   patch:
 *     summary: Активация или деактивация клиента
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Статус клиента обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /clients/{id}/last-activity:
 *   patch:
 *     summary: Обновление или создание активности клиента
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branch_id
 *               - service_id
 *             properties:
 *               branch_id:
 *                 type: integer
 *               service_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Активность клиента обновлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /clients/{id}:
 *   patch:
 *     summary: Обновление информации клиента
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               custom_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Клиент обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 client:
 *                   $ref: '#/components/schemas/Client'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Client:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         custom_name:
 *           type: string
 *         phone_number:
 *           type: string
 *         password:
 *           type: string
 *         source_id:
 *           type: string
 *         is_active:
 *           type: boolean
 *         organization_id:
 *           type: integer
 *
 *     ClientActivity:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         client_id:
 *           type: integer
 *         branch_id:
 *           type: integer
 *         service_id:
 *           type: integer
 *         last_active_at:
 *           type: string
 *           format: date-time
 */
