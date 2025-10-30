import type { NextFunction, Request, Response } from "express";
import { Op, type WhereOptions } from "sequelize";
import Assignment, {
  ASSIGMENT_PAID, ASSIGMENT_PAID_METHOD,
  ASSIGNMENT_STATUSES,
  type AssignmentAttributes, type AssignmentPaid, type AssignmentPaidMethod,
  type AssignmentStatus,
} from "./Assignment.ts";
import Branch from "../organization/Branch.ts";
import getDayRange from "../../utils /getDayRange.ts";
import Organization from "../organization/Organization.ts";
import Client from "../client/Client.ts";
import OrganizationStaff from "../staff/OrganizationStaff.ts";
import transformPrices from "../../utils /transformPrices.ts";
import { DateTime } from "luxon";
import { checkTimeOverlap } from "./checkTimeOverlap.ts";
import type { ServiceInfo, UserInfo } from "../../types";
import User from "../user/User.ts";
import axios from "axios";
import { octoApi } from "../../constants/urls.ts";

export const getListAssignments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employee_id, branch_id, client_id } = req.query;
    const date = req.query.date as string;

    const where: WhereOptions<Assignment> = {};

    if (!branch_id) {
      return res.status(400).send({ error: "branchId is required" });
    }

    const branch = await Branch.findByPk(Number(branch_id));
    if (!branch) {
      return res.status(400).send({ error: "Branch not found" });
    }

    if (date) {
      const tz = branch.timezone || "UTC";
      const { startOfDay, endOfDay } = getDayRange(date, date, tz);
      where.assignment_date = { [Op.between]: [startOfDay, endOfDay] };
    }

    if (branch) where.branch_id = branch.id;
    if (employee_id) where.employee_id = Number(employee_id);
    if (client_id) where.client_id = Number(client_id);

    const assignments = await Assignment.findAll({ where });
    res.send(assignments);
  } catch (e) {
    console.log( "Error get list assignment", e);
    next(e);
  }
}

export const getAssignmentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByPk(id);

    if (!assignment) {
      return res.status(404).send({error: "No Assignment found with this id"});
    }

    res.send(assignment);
  } catch (e) {
    console.log("Error get assignment by id", e);
    next(e);
  }
}

export const createAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      organization_id,
      branch_id,
      client_id,
      employee_id,
      service,
      additional_services,
      assignment_date,
      start_time,
      notes,
      source,
      discount,
    } = req.body;

    const organization = await Organization.findByPk(organization_id);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const branch = await Branch.findByPk(branch_id);
    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    const client = await Client.findByPk(client_id);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const employee = await OrganizationStaff.findByPk(employee_id);
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

    const normalizePrice = (s: ServiceInfo) => ({
      ...s,
      price: transformPrices(s.price),
    });

    const normalizedService = normalizePrice(service);
    const normalizedAdditional = Array.isArray(additional_services)
      ? additional_services.map(normalizePrice)
      : [];

    const totalPrice =
      normalizedService.price +
      normalizedAdditional.reduce((sum: number, s: ServiceInfo) => sum + s.price, 0);

    const totalDuration =
      service.duration +
      normalizedAdditional.reduce((sum: number, s: ServiceInfo) => sum + s.duration, 0);

    const finalPrice = Math.max(0, Math.round(totalPrice - (totalPrice * discount) / 100));
    const startDateTime = DateTime.fromISO(`${assignment_date}T${start_time}`, {
      zone: branch.timezone,
    });

    const endDateTime = startDateTime.plus({ minutes: totalDuration });
    const assignmentDateUTC = startDateTime.startOf("day").toUTC().toJSDate();
    const startTimeUTC = startDateTime.toUTC().toFormat("HH:mm");
    const endTimeUTC = endDateTime.toUTC().toFormat("HH:mm");

    const overlap = await checkTimeOverlap(
      employee_id,
      branch_id,
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

    const newAssignment = await Assignment.create({
      organization_id: organization_id,
      branch_id: branch_id,
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
        first_name: employee.first_name,
        last_name: employee.last_name || null,
        role: employee.role,
      },
      service_id: normalizedService.id!,
      service_snapshot: {
        name: normalizedService.name,
        price: normalizedService.price,
        duration: normalizedService.duration,
      },
      additional_services: additional_services && normalizedAdditional.length > 0
        ? normalizedAdditional.map((s: ServiceInfo) => ({
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
    console.error("Error creating assignment:", error);
    next(error);
  }
}

export const editAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const token = req.headers.authorization!.split(" ")[1];

    const assignment = await Assignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const updates: Partial<AssignmentAttributes> = {};

    const {
      service,
      additional_services,
      start_time,
      end_time,
      assignment_date,
      employee_id,
      notes,
      status,
      discount,
      paid,
      payment_method,
      gift_certificate_id
    } = req.body;

    if (status && !ASSIGNMENT_STATUSES.includes(status as AssignmentStatus)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    if (status) updates.status = status;
    if (notes) updates.notes = notes;

    let employeeSnapshot = assignment.employee_snapshot;
    if (employee_id) {
      const employee = await OrganizationStaff.findByPk(employee_id);
      if (!employee) return res.status(404).json({ error: "Employee not found" });
      updates.employee_id = employee_id;
      employeeSnapshot = {
        first_name: employee.first_name,
        last_name: employee.last_name || null,
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
      totalPrice += assignment.final_price;
      totalDuration += assignment.total_duration;
    }

    const currentDate = assignment_date
      ? DateTime.fromISO(assignment_date, { zone: assignment.timezone })
      : DateTime.fromJSDate(assignment.assignment_date, { zone: "utc" }).setZone(assignment.timezone).startOf("day");

    const start = start_time ?? assignment.start_time;
    const end = end_time ?? assignment.end_time;

    const startDateTime = DateTime.fromISO(`${currentDate.toISODate()}T${start}`, { zone: assignment.timezone });
    let endDateTime = DateTime.fromISO(`${currentDate.toISODate()}T${end}`, { zone: assignment.timezone });

    if (!end_time) {
      endDateTime = startDateTime.plus({ minutes: totalDuration });
    }

    if (endDateTime <= startDateTime) {
      return res.status(400).json({ error: "End time cannot be earlier than start time" });
    }

    if (assignment_date) updates.assignment_date = startDateTime.toUTC().toJSDate();
    if (start_time) updates.start_time = startDateTime.toUTC().toFormat("HH:mm");
    if (end_time) updates.end_time = endDateTime.toUTC().toFormat("HH:mm");

    // if (employeeId || assignmentDate || startTime || endTime) {
    //   const checkEmployeeId = employeeId ?? assignment.employee_id;
    //   const checkAssignmentDate = updates.assignment_date ?? assignment.assignment_date;
    //   const checkStartTime = updates.start_time ?? assignment.start_time;
    //   const checkEndTime = updates.end_time ?? assignment.end_time;
    //
    //   const overlap = await checkTimeOverlap(
    //     checkEmployeeId,
    //     assignment.branch_id,
    //     checkAssignmentDate,
    //     checkStartTime,
    //     checkEndTime
    //   );
    //   if (overlap) {
    //     return res.status(409).json({ error: "The employee is already booked at this time" });
    //   }
    // }

    const normalizedAdditional = Array.isArray(additional_services)
      ? additional_services.map((s) => ({ ...s, price: transformPrices(s.price) }))
      : [];

    if (normalizedAdditional.length > 0) {
      updates.additional_services = normalizedAdditional;
      for (const s of normalizedAdditional) {
        totalPrice += s.price;
        totalDuration += s.duration;
      }
    }

    let discountValue = discount ?? assignment.discount ?? 0;
    updates.discount = discountValue;
    updates.final_price = Math.max(0, Math.round(totalPrice - (totalPrice * discountValue) / 100));
    updates.total_duration = totalDuration;

    let issued_by: UserInfo;
    const userDb = await User.findByPk(user.id);

    if (userDb) {
      issued_by = {
        id: userDb.id,
        first_name: userDb.first_name,
        last_name: userDb.last_name,
        role: userDb.role,
      };
    } else {
      const managerDb = await OrganizationStaff.scope("managers").findByPk(user.id);

      if (managerDb) {
        issued_by = {
          id: managerDb.id,
          first_name: managerDb.first_name,
          last_name: managerDb.last_name,
          role: managerDb.role,
        };
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    }

    updates.manager_id = issued_by.id;
    updates.manager_snapshot = {
      first_name: issued_by.first_name,
      last_name: issued_by.last_name || null,
      role: issued_by.role,
    };

    if (paid) {
      if (!ASSIGMENT_PAID.includes(paid as AssignmentPaid)) {
        return res.status(400).json({ error: "Invalid paid value" });
      }
      updates.paid = paid;
      if (paid !=="refund" && !payment_method && !ASSIGMENT_PAID_METHOD.includes(payment_method.type as AssignmentPaidMethod)) {
        return res.status(400).json({ error: "Payment method required when marking as paid" });
      }

      if (payment_method === "gift_certificate" && !gift_certificate_id) {
        return res.status(400).json({ error: "Please provide the gift certificate ID" });
      }

      updates.payment_method = payment_method;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    if (paid === "refund") {
      try {
        await axios.patch(
          `http://localhost:3000/accounting/refund/${assignment.id}?branch_id=${assignment.branch_id}`,
          {
            status: "refund",
          },
          {
            headers: {
              authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        return res.send({
          message:
            "Assignment updated successfully. Related accounting record marked as 'refund'.",
          assignment,
        });
      } catch (e) {
        return res.status(400).send({ error: e });
      }
    }

    if (paid === "paid") {
      const client = assignment.client_snapshot;
      const employee = assignment.employee_snapshot;
      const managerSnap = updates.manager_snapshot;
      let certificate;

      if (
        !updates.payment_method ||
        !assignment.total_duration ||
        !updates.final_price
      ) {
        return res
          .status(400)
          .send({ error: "Missing required fields for accounting" });
      }

      if (payment_method === "gift_certificate") {
        // if (!gift_certificate_id) {
        //   return res.status(400).send({ error: "Invalid gift certificate id" });
        // }

        const res = await axios.post(octoApi + "giftCertificate/" + gift_certificate_id, {
          headers: {
            authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        console.log(res.data);
      }

      updates.discount = discountValue;
      updates.final_price = Math.max(0, Math.round(totalPrice - (totalPrice * discountValue) / 100));
      updates.total_duration = totalDuration;

      const newAccounting = {
        branch_id: assignment.branch_id,
        client_id: assignment.client_id,
        client_snapshot: {
          first_name: client.first_name,
          last_name: client.last_name || null,
          phone: client.phone,
        },
        employee_id: assignment.employee_id,
        employee_snapshot: employee,
        manager_id: updates.manager_id,
        manager_snapshot: managerSnap,
        assignment_id: assignment.id,
        duration: assignment.total_duration,
        payment_method: updates.payment_method,
        discount: updates.discount || assignment.discount || 0,
        date: DateTime.now().setZone(assignment.timezone).toUTC().toJSDate(),
        timezone: assignment.timezone,
        amount: updates.final_price,
        status: "success",
        // gift_certificate_id,
        // gift_certificate_snapshot
      }

        await axios.post(octoApi +"accounting?branch_id=" + assignment.branch_id, {...newAccounting}, {
          headers: {
            authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      await assignment.update(updates);
      return res.json({
        message: `Assignment updated successfully. Created accounting"}`,
        assignment
      });
    }

    await assignment.update(updates);
    return res.json({
      message: `Assignment updated successfully`,
      assignment
    });
  } catch (e) {
    if (axios.isAxiosError(e)) {
      return res.status(e.response?.status || 500).json({
        success: false,
        message: e.response?.data?.message || e.message,
        data: e.response?.data || null,
        url: e.config?.url,
        method: e.config?.method,
      });
    }
    console.error("Assigment create error", e);
    next(e);
  }
}

export const deleteAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByPk(id);

    if (!assignment) {
      return res.status(400).json({error: "Assignment not found"});
    }

    if (assignment.paid === "paid") {
      return res.status(400).json({error: "You cannot delete a paid assignment."});
    }

    await assignment.destroy();
  } catch (e) {
    next(e);
  }
}