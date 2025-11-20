import { Router } from "express";
import { createAssignment } from "../../assignments/controllers/assignment.controller.ts";

const AssignmentsBookingServiceRoute = Router();

AssignmentsBookingServiceRoute.post("/", createAssignment);

export default AssignmentsBookingServiceRoute;