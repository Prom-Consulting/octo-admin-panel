import express from "express";
import Client from "./models/Client.ts";
import type { Request, Response, NextFunction } from "express";

const ClientServiceRouter = express.Router();


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


