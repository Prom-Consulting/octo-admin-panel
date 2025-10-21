import express, {type Request, type Response, type NextFunction } from "express";
import Assignment, {
  ASSIGMENT_PAID,
  ASSIGNMENT_STATUSES,
  type AssignmentAttributes, type AssignmentPaid,
  type AssignmentStatus,
} from "./Assignment.ts";
import transformPrices from "../../utils /transformPrices.ts";
import Organization from "../organization/Organization.ts";
import { DateTime } from "luxon";
import idGeneration from "../../utils /idGeneration.ts";
import z from "zod";
import Client from "../client/Client.ts";
import OrganizationStaff from "../staff/OrganizationStaff.ts";
import WorkingDates from "../staff/WorkingDates.ts";
import { checkTimeOverlap } from "./checkTimeOverlap.ts";
import { CreateAssignmentSchema } from "./assignment.schema.ts";
import Branch from "../organization/Branch.ts";
import { Op } from "sequelize";
import { authenticateToken, authorizeRoles } from "../../middleware/authStaffMiddleware.ts";

const AssignmentsServiceRoute = express.Router();

AssignmentsServiceRoute.get("/", (req, res, next) => {
  try {
    const assignment = Assignment.findAll();
    res.send(assignment);
  } catch (e) {
    console.log(e);
    next(e);
  }
});

AssignmentsServiceRoute.get("/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = Assignment.findByPk(id);

    if (!assignment) {
      return res.status(404).send({error: "No Assignment found with this id"});
    }

    res.send(assignment);
  } catch (e) {
    console.log(e);
    next(e);
  }
});


AssignmentsServiceRoute.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateAssignmentSchema.parse(req.body);

    const {
      organizationId,
      branchId,
      clientId,
      employeeId,
      service,
      additionalServices,
      assignmentDate,
      startTime,
      notes,
      source,
      discount,
    } = data;

    // --- Проверяем организацию, клиента, сотрудника ---
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const employee = await OrganizationStaff.scope("employees").findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // const workingDates = await WorkingDates.findOne({
    //   where: {
    //     branch_id: branchId,
    //     staff_id: employee.id,
    //   }
    // });
    //
    // if(!workingDates || (workingDates && workingDates.is_day_off)) {
    //   return res.status(400).send({ error: "The employee is not working on this date or has the day off." });
    // }

    const normalizePrice = (s: any) => ({
      ...s,
      price: transformPrices(s.price),
    });

    const normalizedService = normalizePrice(service);
    const normalizedAdditional = additionalServices.map(normalizePrice);

    const totalPrice =
      normalizedService.price +
      normalizedAdditional.reduce((sum: number, s: any) => sum + s.price, 0);

    const totalDuration = service.duration +
      additionalServices.reduce((sum: number, s: any) => sum + s.duration, 0);

    const finalPrice = Math.max(0, Math.round(totalPrice - (totalPrice * discount) / 100));

    // --- Формирование времени и проверка пересечений ---
    const startDateTime = DateTime.fromISO(`${assignmentDate}T${startTime}`, {
      zone: branch.timezone,
    });

    const endDateTime = startDateTime.plus({ minutes: totalDuration });
    const assignmentDateUTC = startDateTime.startOf("day").toUTC().toJSDate();
    const startTimeUTC = startDateTime.toUTC().toFormat("HH:mm");
    const endTimeUTC = endDateTime.toUTC().toFormat("HH:mm");

    const overlap = await checkTimeOverlap(
      employeeId,
      branchId,
      assignmentDateUTC,
      startTimeUTC,
      endTimeUTC
    );
    if (overlap) {
      return res.status(409).json({
        error: "The employee is already booked at this time",
        details: { startTimeUTC, endTimeUTC, timezone:branch.timezone },
      });
    }

    // --- Создание записи ---
    const newAssignment = await Assignment.create({
      id: idGeneration(organization.name + "_" + organizationId, 6),
      organization_id: organizationId,
      branch_id: branchId,
      assignment_date: assignmentDateUTC,
      start_time: startTimeUTC,
      end_time: endTimeUTC,
      client_id: client.id,
      client_snapshot: {
        first_name: client.first_name,
        last_name: client.last_name || null,
        phone: client.phone_number,
      },
      employee_id: employee.id,
      employee_snapshot: {
        first_name: employee.firstname,
        last_name: employee.lastname || null,
        role: employee.role,
      },
      service_id: normalizedService.id,
      service_snapshot: {
        name: normalizedService.name,
        price: normalizedService.price,
        duration: normalizedService.duration,
      },
      additional_services:  normalizedAdditional.length > 0
        ? normalizedAdditional.map((s: any) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration: s.duration,
        }))
        : null,
      status: "new",
      notes: notes || null,
      source,
      discount: discount || 0,
      final_price: finalPrice,
      total_duration: totalDuration,
      payment_method: null,
      paid: "unpaid",
      timezone: branch.timezone,
    });

    return res.send({
      success: true,
      data: newAssignment,
      message: "Assignment created successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    console.error("Error creating assignment:", error);
    next(error);
  }
});

AssignmentsServiceRoute.patch("/calendar/:id",
  authenticateToken, authorizeRoles("manager"),
  async (req, res, next) => {
  try {
    const { id } = req.params;
    const manager = req.user!;

    const assignment = await Assignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const updates: Partial<AssignmentAttributes> = {};

    const {
      service,
      additionalServices,
      startTime,
      endTime,
      assignmentDate,
      employeeId,
      notes,
      status,
      discount,
      paid,
      paymentMethod,
    } = req.body;

    if (status && !ASSIGNMENT_STATUSES.includes(status as AssignmentStatus)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    if (status) updates.status = status;
    if (notes) updates.notes = notes;

    let employeeSnapshot = assignment.employee_snapshot;
    if (employeeId) {
      const employee = await OrganizationStaff.scope("employees").findByPk(employeeId);
      if (!employee) return res.status(404).json({ error: "Employee not found" });
      updates.employee_id = employeeId;
      employeeSnapshot = {
        first_name: employee.firstname,
        last_name: employee.lastname || null,
        role: employee.role,
      };
      updates.employee_snapshot = employeeSnapshot;
    }



    let totalPrice = 0;
    let totalDuration = 0;

    if (service) {
      const normalizedService = { ...service, price: transformPrices(service.price) };
      updates.service_id = service.id;
      updates.service_snapshot = {
        name: service.name,
        price: normalizedService.price,
        duration: service.duration,
      };
      totalPrice += normalizedService.price;
      totalDuration += service.duration;
    } else {
      totalPrice += assignment.service_snapshot.price;
      totalDuration += assignment.service_snapshot.duration;
    }

    let currentDate = assignmentDate
      ? DateTime.fromISO(assignmentDate, { zone: assignment.timezone }).toISODate()
      : DateTime.fromJSDate(assignment.assignment_date, { zone: "UTC" }).setZone(assignment.timezone).toISODate();

    let startDateTime = DateTime.fromISO(`${currentDate}T${startTime ?? assignment.start_time}`, {
      zone: assignment.timezone,
    });
    let endDateTime = endTime
      ? DateTime.fromISO(`${currentDate}T${endTime}`, { zone: assignment.timezone })
      : startDateTime.plus({ minutes: totalDuration });

    if (endDateTime <= startDateTime) {
      return res.status(400).json({ error: "End time cannot be earlier than start time" });
    }

    updates.assignment_date = startDateTime.toUTC().toJSDate();
    updates.start_time = startDateTime.toUTC().toFormat("HH:mm");
    updates.end_time = endDateTime.toUTC().toFormat("HH:mm");
    updates.timezone = assignment.timezone;

    if (employeeId || assignmentDate || startTime || endTime) {
      const checkEmployeeId = employeeId ?? assignment.employee_id;
      const checkAssignmentDate = updates.assignment_date ?? assignment.assignment_date;
      const checkStartTime = updates.start_time ?? assignment.start_time;
      const checkEndTime = updates.end_time ?? assignment.end_time;

      const overlap = await Assignment.findOne({
        where: {
          employee_id: checkEmployeeId,
          branch_id: assignment.branch_id,
          assignment_date: checkAssignmentDate,
          id: { [Op.ne]: assignment.id },
          status: { [Op.notIn]: ["canceled", "completed"] },
          [Op.and]: [
            { start_time: { [Op.lt]: checkEndTime } },
            { end_time: { [Op.gt]: checkStartTime } },
          ],
        },
      });

      if (overlap) {
        return res.status(409).json({ error: "The employee is already booked at this time" });
      }
    }

    const normalizedAdditional = Array.isArray(additionalServices)
      ? additionalServices.map((s: any) => ({ ...s, price: transformPrices(s.price) }))
      : [];

    if (normalizedAdditional.length > 0) {
      updates.additional_services = normalizedAdditional;
      for (const s of normalizedAdditional) {
        totalPrice += s.price;
        totalDuration += s.duration;
      }
    }

    const discountValue = discount ?? assignment.discount ?? 0;
    updates.discount = discountValue;
    console.log("total price", totalPrice);
    console.log("discountValue", discountValue);
    updates.final_price = Math.max(0, Math.round(totalPrice - (totalPrice * discountValue) / 100));
    console.log("final price", updates.final_price);
    updates.total_duration = totalDuration;

    const managerDb = await OrganizationStaff.scope("managers").findByPk(manager.id);
    if (!managerDb) return res.status(404).json({ error: "Manager not found" });
    updates.manager_id = manager.id;
    updates.manager_snapshot = {
      first_name: managerDb.firstname,
      last_name: managerDb.lastname || null,
      role: managerDb.role,
    };

    if (paid) {
      if (!ASSIGMENT_PAID.includes(paid as AssignmentPaid)) {
        return res.status(400).json({ error: "Invalid paid value" });
      }
      updates.paid = paid;
      if (paid && !paymentMethod) {
        return res.status(400).json({ error: "Payment method required when marking as paid" });
      }
      updates.payment_method = paymentMethod;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    await assignment.update(updates);
    return res.json({ message: "Assignment updated successfully", assignment });
  } catch (e) {
    console.error(e);
    next(e);
  }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     Staff:
 *       type: object
 *       properties:
 *         first_name:
 *           type: string
 *           example: "Jane"
 *         last_name:
 *           type: string
 *           example: "Doe"
 *           nullable: true
 *         role:
 *           type: string
 *           example: "employee"
 *
 *     ClientInfo:
 *       type: object
 *       properties:
 *         first_name:
 *           type: string
 *           example: "John"
 *         last_name:
 *           type: string
 *           example: "Smith"
 *           nullable: true
 *         phone:
 *           type: string
 *           example: "+123456789"
 *
 *     ServiceInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Haircut"
 *         price:
 *           type: number
 *           example: 50
 *         duration:
 *           type: number
 *           example: 60
 *
 *     Assignment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "a1b2c3d4"
 *         chat_id:
 *           type: string
 *           example: "chat123"
 *           nullable: true
 *         branch_id:
 *           type: integer
 *           example: 2
 *         organization_id:
 *           type: integer
 *           example: 1
 *         client_id:
 *           type: integer
 *           example: 10
 *         client_snapshot:
 *           $ref: '#/components/schemas/ClientInfo'
 *         service_id:
 *           type: integer
 *           example: 1
 *         service_snapshot:
 *           $ref: '#/components/schemas/ServiceInfo'
 *         assignment_date:
 *           type: string
 *           format: date
 *           example: "2025-10-15"
 *         start_time:
 *           type: string
 *           example: "10:00"
 *         end_time:
 *           type: string
 *           example: "11:00"
 *         manager_id:
 *           type: integer
 *           example: 3
 *           nullable: true
 *         manager_snapshot:
 *           $ref: '#/components/schemas/UserInfo'
 *           nullable: true
 *         employee_id:
 *           type: integer
 *           example: 5
 *         employee_snapshot:
 *           $ref: '#/components/schemas/UserInfo'
 *         timezone:
 *           type: string
 *           example: "Asia/Bishkek"
 *         status:
 *           type: string
 *           enum: [new, scheduled, completed, canceled]
 *           example: "new"
 *         additional_services:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ServiceInfo'
 *           nullable: true
 *         notes:
 *           type: string
 *           example: "Client requested extra service"
 *           nullable: true
 *         source:
 *           type: string
 *           example: "web_booking"
 *         discount:
 *           type: number
 *           example: 10
 *           nullable: true
 *         final_price:
 *           type: number
 *           example: 90
 *         total_duration:
 *           type: number
 *           example: 60
 *         payment_method:
 *           type: string
 *           example: "cash"
 *           nullable: true
 *         paid:
 *           type: string
 *           enum: [paid, unpaid, refund]
 *           example: "unpaid"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-10-15T10:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-10-15T10:00:00Z"
 *
 * /assignments:
 *   get:
 *     summary: Get all assignments
 *     tags:
 *       - Assignments
 *     responses:
 *       200:
 *         description: List of assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 *       500:
 *         description: Server error
 *
 * /assignments/{id}:
 *   get:
 *     summary: Get assignment by ID
 *     tags:
 *       - Assignments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "a1b2c3d4"
 *     responses:
 *       200:
 *         description: Assignment found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       404:
 *         description: Assignment not found
 *         content:
 *           application/json:
 *             example: { "error": "No Assignment found with this id" }
 *       500:
 *         description: Server error
 *
 * /assignments/calendar:
 *   post:
 *     summary: Create a new assignment
 *     tags:
 *       - Assignments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientAssignment
 *             properties:
 *               clientAssignment:
 *                 $ref: '#/components/schemas/Assignment'
 *     responses:
 *       200:
 *         description: Assignment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 *
 * /assignments/calendar/{id}:
 *   put:
 *     summary: Update an existing assignment
 *     tags:
 *       - Assignments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "a1b2c3d4"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientAssignment
 *             properties:
 *               clientAssignment:
 *                 $ref: '#/components/schemas/Assignment'
 *     responses:
 *       200:
 *         description: Assignment updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */


export default  AssignmentsServiceRoute;