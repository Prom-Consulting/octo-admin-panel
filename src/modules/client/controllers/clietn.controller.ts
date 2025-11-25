import Client, { type ClientAttributes, clientPasswordVerification, hashClientPassword } from "../models/Client.ts";
import type { NextFunction, Response, Request } from "express";
import { Op, type WhereOptions } from "sequelize";

export const getClients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstname, lastname, phoneNumber, isActive } = req.query;

    const where: WhereOptions<ClientAttributes> = {};

    if (firstname) {
      where.first_name = { [Op.iLike]: `%${firstname}%` };
    }

    if (lastname) {
      where.last_name = { [Op.iLike]: `%${lastname}%` };
    }

    if (phoneNumber) {
      where.phone_number = { [Op.iLike]: `%${phoneNumber}%` };
    }

    if (isActive !== undefined) {
      where.is_active = isActive === "true";
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);
    const offset = (page - 1) * limit;

    const { rows: clients, count } = await Client.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "ASC"]],
      attributes: { exclude: ["password", "token"] },
    });

    res.json({
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
      data: clients,
    });

  } catch (e) {
    console.log("Get clients error", e);
    next(e);
  }
};

export const getClientById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const client = await Client.findOne({
      where: { id },
      attributes: { exclude: ["password", "token", "phone_number"] },
    });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json(client);
  } catch (e) {
    console.log("Get client by id error", e);
    next(e);
  }
};

export const getClientSelf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authClient = req.client;
    if (!authClient) return res.status(404).json({ error: "Client not found" });

    const client = await Client.findOne({
      where: { id: authClient.id },
      attributes: { exclude: ["password", "token"] },
    });
    if (!client) return res.status(404).json({ error: "Client not found" });

    return res.json(client);
  } catch (e) {
    console.log("Get client by self error", e);
    next(e);
  }
};

export const updateClientSelf = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const authClient = req.client;

    if (!authClient) {
      return res.status(404).json({ error: "Client not found" });
    }

    const client = await Client.findOne({
      where: {
        id: authClient.id,
        phone_number: authClient.phone_number,
        first_name: authClient.first_name,
      },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const { firstname, lastname, phoneNumber, password, currentPassword } = req.body;

    const requiresPasswordCheck =
      password !== undefined || phoneNumber !== undefined;

    if (requiresPasswordCheck) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ error: "currentPassword is required to change password or phone_number" });
      }

      const matches = await clientPasswordVerification(currentPassword, client.password);
      if (!matches) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }

    if (firstname !== undefined) client.first_name = firstname;
    if (lastname !== undefined) client.last_name = lastname;
    if (phoneNumber !== undefined) client.phone_number = phoneNumber;

    if (password) {
      client.password = await hashClientPassword(password);
    }

    await client.save();

    res.json(client);
  } catch (e) {
    console.log("Update client error", e);
    next(e);
  }
};

export const updateActiveClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const client = await Client.findByPk(id);

    if (!client) return res.status(404).json({ error: "Client not found" });

    client.is_active = !client.is_active;
    await client.save();

    return res.json({ message: "Client deactivated" });
  } catch (e) {
    console.error("Deactivate client error", e);
    next(e);
  }
};

