import express from "express";
import ClientAuthServiceRouter from "./auth.service.ts";
import ClientServiceRouter from "./client.service.ts";

const ClientIndexRouter = express.Router();

ClientIndexRouter.use("/auth", ClientAuthServiceRouter );
ClientIndexRouter.use("/", ClientServiceRouter);

export default ClientIndexRouter;