import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { logger } from "./logger";
import { dbConnection } from "./db";
import UserServiceRoute from "./modules/user/user.service.ts";
import BranchServiceRoute from "./modules/organization/routers/branch.service.ts";
import { setupSwagger } from "../swagger.ts";
import ClientServiceRouter from "./modules/client/client.service.ts";
import OrganizationServiceRoute from "./modules/organization/routers/organization.service.ts";
import BookingRoute from "./modules/booking/booking.service.ts";
import AssignmentsServiceRoute from "./modules/assignments/assignment.service.ts";
import OrganizationStaffAuthorizationRouter from "./modules/staff/organizationStaffAuthorization.ts";
import OrganizationStaffRouter from "./modules/staff/organizationStaff.service.ts";
import AssignmentsBookingServiceRoute from "./modules/booking/assignmentsBooking.service.ts";
import WorkingDatesServiceRoute from "./modules/staff/workingDates.service.ts";
import cookieParser from "cookie-parser";
import AdminServiceRoute from "./modules/admin/routers";

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
      ], // только для фронта на 3000 порту
    methods: ["GET", "POST", "PUT", "DELETE"], // какие методы разрешены
    credentials: true, // если надо передавать куки или токены
  })
);
app.use(express.json());
app.use("/user", UserServiceRoute);
app.use("/branches", BranchServiceRoute);
app.use("/clients", ClientServiceRouter);
app.use("/organizations", OrganizationServiceRoute);
app.use("/assignments", AssignmentsServiceRoute);
app.use("/staffAuthorization", OrganizationStaffAuthorizationRouter);
app.use("/staff", OrganizationStaffRouter);
app.use("/working-dates", WorkingDatesServiceRoute)

//superadmin routes
app.use("/admin", AdminServiceRoute);

// booking routes
app.use("/booking", BookingRoute);
app.use("/booking", AssignmentsBookingServiceRoute);

setupSwagger(app);

const run = async () => {
  await dbConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

void run();
