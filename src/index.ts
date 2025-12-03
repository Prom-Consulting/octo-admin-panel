import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { logger } from "./logger";
import { dbConnection } from "./db";
import UserServiceRoute from "./modules/user/routers";
import BranchServiceRoute from "./modules/organization/routers/branch/branch.service.ts";
import { setupSwagger } from "../swagger.ts";
import AssignmentsServiceRoute from "./modules/assignments/routers/assignment.service.ts";
import cookieParser from "cookie-parser";
import StaffRouter from "./modules/staff/routers";
import OrganizationStaffAuthorizationRouter from "./modules/staff/routers/auth.service.ts";
import WorkingDatesServiceRoute from "./modules/staff/routers/workingDates.service.ts";
import AdminServiceRoute from "./modules/admin/routers";
import { setupClientActivityListeners } from "./events/clients/clientActivityListener.ts";
import BookingRoute from "./modules/booking/routers";
import ClientIndexRouter from "./modules/client/routers";
import OrganizationIndexRouter from "./modules/organization/routers/organization";
import importJobsServiceRoute from "./modules/ImportJobs/routers";
import Piscina from "piscina";
import { resolve } from "path";
config();

const app = express();
const PORT = 8000;

app.use(logger);
app.use(cookieParser());
app.use(
  cors({
      origin: [
        "https://instant-arlena-promconsulting-cb589535.koyeb.app",
        "http://localhost:5173",
        "http://localhost:5174",
      ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());
void setupClientActivityListeners();

app.use("/user", UserServiceRoute);
app.use("/branches", BranchServiceRoute);
app.use("/clients", ClientIndexRouter);
app.use("/organizations", OrganizationIndexRouter);
app.use("/assignments", AssignmentsServiceRoute);
app.use("/staffAuthorization", OrganizationStaffAuthorizationRouter);
app.use("/staff", StaffRouter);
app.use("/working-dates", WorkingDatesServiceRoute);
app.use("/import-file", importJobsServiceRoute);

//superadmin routes
app.use("/admin", AdminServiceRoute);

// booking routes
app.use("/booking", BookingRoute);

setupSwagger(app);

console.log("piscina run");
const piscina = new Piscina({
  filename: resolve(__dirname, "./workerWrapper.js"),
  workerData: {
    fullpath: resolve(__dirname, "./index.worker.js") // или .ts если используете tsx
  },
});

const result = await piscina.run({ a: 5, b: 10 });
console.log('Result:', result);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

const run = async () => {
  console.log("run start");
  await dbConnection();
  console.log("db connection");

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

run().catch(console.error);
