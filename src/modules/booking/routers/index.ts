import { Router } from "express";
import AssignmentsBookingServiceRoute from "./assigments.service.ts";

const BookingRoute = Router();

BookingRoute.use("/assignments", AssignmentsBookingServiceRoute);

export default BookingRoute;