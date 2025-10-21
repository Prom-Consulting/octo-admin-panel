import express, { type Response, type NextFunction } from "express";
import Assignment from "../models/Assignment.ts";
import transformPrices from "../utils /transformPrices.ts";
import Organization from "../models/Organization.ts";
import { DateTime } from "luxon";
import idGeneration from "../utils /idGeneration.ts";
import z from "zod";
import { Op } from "sequelize";
import Client from "../models/Client.ts";
import OrganizationStaff from "../models/OrganizationStaff.ts";

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

const CreateAssignmentSchema = z.object({
  organizationId: z.number().int().positive(),
  branchId: z.number().int().positive(),
  timezone: z.string().default("UTC"),
  clientId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  assignmentDate: z.string(),
  startTime: z.string(),
  notes: z.string().nullable().optional(),
  source: z.enum(["web", "mobile", "admin", "booking"]),
  discount: z.number().min(0).max(100).default(0),
  service: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    price: z.number(),
    duration: z.number(),
  }),
  additionalServices: z
    .array(
      z.object({
        id: z.number().int().positive(),
        price: z.number(),
        duration: z.number(),
      })
    )
    .default([]),
});

type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;

const checkTimeOverlap = async (
  employeeId: number,
  branchId: number,
  assignmentDate: Date,
  startTime: string,
  endTime: string
): Promise<boolean> => {
  const overlap = await Assignment.findOne({
    where: {
      employee_id: employeeId,
      branch_id: branchId,
      assignment_date: assignmentDate,
      status: { [Op.notIn]: ["canceled", "completed"] },
      [Op.and]: [
        { start_time: { [Op.lt]: endTime } },
        { end_time: { [Op.gt]: startTime } },
      ],
    },
  });
  return !!overlap;
};

AssignmentsServiceRoute.post("/calendar", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateAssignmentSchema.parse(req.body);

    const {
      organizationId,
      branchId,
      timezone,
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

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const employee = await OrganizationStaff.scope("employees").findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const totalPrice =
      transformPrices(service.price) +
      additionalServices.reduce((sum: number, s: any) => sum + transformPrices(s.price), 0);

    const totalDuration =
      service.duration +
      additionalServices.reduce((sum: number, s: any) => sum + s.duration, 0);

    const finalPrice = Math.max(
      0,
      totalPrice - (totalPrice * discount) / 100
    );

    // --- Формирование времени и проверка пересечений ---
    const startDateTime = DateTime.fromISO(`${assignmentDate}T${startTime}`, {
      zone: timezone,
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
        details: { startTimeUTC, endTimeUTC },
      });
    }

    // --- Создание записи ---
    const newAssignment = await Assignment.create({
      id: idGeneration(`ORG${organizationId}`, 6),
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
      service_id: service.id,
      service_snapshot: {
        name: service.name,
        price: service.price,
        duration: service.duration,
      },
      additional_services:
        additionalServices.length > 0 ? additionalServices : null,
      status: "new",
      notes: notes || null,
      source,
      discount: discount || 0,
      final_price: finalPrice,
      total_duration: totalDuration,
      payment_method: null,
      paid: "unpaid",
      timezone,
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

AssignmentsServiceRoute.patch("/calendar/:id", async (req, res, next) => {
  try {
    const {
      clientAssignment
    } = req.body;

    const { id } = req.params;
    const assignment = await Assignment.findByPk(id);
    if ( !assignment ) {
      return res.status(404).send({error: "No Assignment found with this id"});
    }

    if (!clientAssignment) {
      res.status(404).send({error: "No data available to create assignment"});
    }

    await assignment.update(clientAssignment);

    res.send(assignment);
  } catch (e) {
    console.log(e);
    next(e);
  }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     UserInfo:
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