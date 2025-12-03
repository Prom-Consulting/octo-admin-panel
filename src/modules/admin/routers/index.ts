import { type NextFunction, type Request, type Response, Router } from "express";
import AdminAuthService from "./auth.service.ts";
import AdminOrganizations from "./organization.service.ts";
import { authAdminMiddleware } from "../../../middleware/authorization/authAdminMiddleware.ts";
import AdminModel from "../models/AdminModel.ts";
import bcrypt from "bcrypt";
import AdminBranchesService from "./branshes.service.ts";
import AdminUsersService from "./users.service.ts";
import AdminClientRouter from "./client.service.ts";

const AdminServiceRoute = Router();

AdminServiceRoute.post(
  "/signUp",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstname, lastname } = req.body;

      const existedAdmin = await AdminModel.findOne({
        where: { email },
      });

      if (existedAdmin) {
        return res.status(422).send({ error: "Admin already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const admin = {
        email,
        role: "admin" as const,
        password: hashedPassword,
        first_name: firstname,
        last_name: lastname
      };

      const newAdmin = await AdminModel.create(admin);

      return res.status(201).json({
        username: newAdmin.email,
        password: newAdmin.password,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt,
      });
    } catch (error) {
      next(error);}
  }
);

AdminServiceRoute.use("/auth", AdminAuthService);

AdminServiceRoute.use(authAdminMiddleware);
AdminServiceRoute.use("/organizations", AdminOrganizations);
AdminServiceRoute.use("/branches", AdminBranchesService);
AdminServiceRoute.use("/user", AdminUsersService);
AdminServiceRoute.use("/clients", AdminClientRouter);

export default AdminServiceRoute;