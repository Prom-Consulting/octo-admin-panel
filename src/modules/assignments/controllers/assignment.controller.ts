import type { NextFunction, Request, Response } from "express";
import { Op, type WhereOptions } from "sequelize";
import Assignment, {
  ASSIGNMENT_STATUSES,
  type AssignmentAttributes,
} from "../models/Assignment.ts";
import getDayRange from "../../../utils /getDayRange.ts";
import OrganizationStaff from "../../staff/models/OrganizationStaff.ts";
import transformPrices from "../../../utils /transformPrices.ts";
import { DateTime } from "luxon";
import { checkTimeOverlap } from "../utils/checkTimeOverlap.ts";
import type { ServiceInfo } from "../../../types";
import axios from "axios";
import { octoApi } from "../../../constants/urls.ts";
import { getBranchAndOrganization } from "../../../utils /auth/getBranchAndOrganization.ts";
import { clientActivityEvents } from "../../../events/clients/clientActivityEvents.ts";
import { findOrCreateClient } from "../utils/createOrFindClient.ts";
import { generateBookingToken } from "../../booking/utils/generateToken.ts";
import WorkingDates from "../../staff/models/WorkingDates.ts";

export const getListAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeId, clientId, date } = req.query;
    const user = req.user;
    const client = req.client;
    const where: WhereOptions<Assignment> = {};

    const { branch } = await getBranchAndOrganization(req, { branch: true });

    if (user?.role === "employee") {
      where.employee_id = user.id;
    } else {
      if (employeeId) where.employee_id = Number(employeeId);
    }

    if (client) {
      where.client_id = client.id;
    } else {
      if (clientId) where.client_id = Number(clientId);
    }

    if (branch) where.branch_id = branch.id;

    if (date) {
      const tz = branch.timezone || "UTC";
      const { startOfDay, endOfDay } = getDayRange(
        date as string,
        date as string,
        tz
      );
      where.assignment_date = { [Op.between]: [startOfDay, endOfDay] };
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);
    const offset = (page - 1) * limit;

    const { rows: assignments, count } = await Assignment.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "ASC"]],
    });

    res.send({
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
      data: assignments,
    });
  } catch (e) {
    console.log("Error get list assignment", e);
    next(e);
  }
};

export const getAssignmentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { branch } = await getBranchAndOrganization(req, { branch: true });
    const where: WhereOptions<AssignmentAttributes> = {id, branch_id: Number(branch.id)};
    const client = req.client;

    if (client) where.client_id = client.id;

    const assignment = await Assignment.findOne({ where });

    if (!assignment) {
      return res.status(404).send({ error: "No Assignment found with this id or this assignment is not related to you in any way" });
    }

    res.send(assignment);
  } catch (e) {
    console.log("Error get assignment by id", e);
    next(e);
  }
};

export const createAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      organizationId,
      branchId,
      employeeId,
      service,
      additionalServices,
      assignmentDate,
      startTime,
      notes,
      source,
      discount,
    } = req.body;

    const user = req.user;
    const token = req.headers.authorization?.split(" ")[1] || null;
    const additionalServicesList = Array.isArray(additionalServices) ? additionalServices : [];

    let client;
    let finalToken = token;
    let isOrganizationPerson = false;

    if (user) isOrganizationPerson = true;

    if (!organizationId || !branchId || !assignmentDate || !startTime) {
      return res.status(400).json({
        error: "organization id, branch id, assignment date and start time is required"
      });
    }

    const { branch, organization } = await getBranchAndOrganization(req, {
      required: true
    });

    client = req.client;
    if (!client) {
      client = req.body.client;
      if (!client?.firstname || !client?.phoneNumber) {
        return res.status(400).json({
          error: "client firstname & phone required"
        });
      }
      const result = await findOrCreateClient(client, organization, user, token);

      if (!result || !result.clientDb) {
        return res.status(400).json({
          error: "Failed to find or create client"
        });
      }

      finalToken = result.token;
      isOrganizationPerson = result.isOrgPerson;
      client = result.clientDb;
      if (!result.clientDb) {
        return res.status(400).json({
          error: "Failed to find or create client"
        });
      }
    }

    if (req.client) finalToken = generateBookingToken(organization.name, organization.id);

    if (!service?.id || !service?.duration) {
      return res.status(400).json({
        error: "service with id and duration is required"
      });
    }

    let targetEmployeeId: number;
    if (user?.role === "employee") {
      targetEmployeeId = user.id;
    } else {
      if (!employeeId) {
        return res.status(400).json({ error: "employeeId is required" });
      }
      targetEmployeeId = Number(employeeId);
    }

    const employee = await OrganizationStaff.findOne({
      where: {
        id: targetEmployeeId,
        organization: {
          [Op.contains]: { id: organization.id },
        },
        branches: {
          [Op.contains]: [{ id: branch.id }]
        }
      }
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const totalPrice =
      service.price +
      additionalServicesList.reduce((sum, s) => sum + s.price, 0);

    const totalDuration =
      service.duration +
      additionalServicesList.reduce((sum, s) => sum + s.duration, 0);

    const discountValue = Math.max(0, Math.min(100, discount || 0));
    const finalPrice = Math.max(
      0,
      Math.round(totalPrice - (totalPrice * discountValue) / 100)
    );

    const startDateTime = DateTime.fromISO(
      `${assignmentDate}T${startTime}`,
      { zone: branch.timezone }
    );

    if (!startDateTime.isValid) {
      return res.status(400).json({
        error: "Invalid date/time format",
        details: startDateTime.invalidReason
      });
    }

    const endDateTime = startDateTime.plus({ minutes: totalDuration });
    const assignmentDateUTC = startDateTime.startOf("day").toUTC().toJSDate();
    const startTimeUTC = startDateTime.toUTC().toFormat("HH:mm");
    const endTimeUTC = endDateTime.toUTC().toFormat("HH:mm");

    const overlap = await checkTimeOverlap(
      targetEmployeeId,
      branchId,
      assignmentDateUTC,
      startTimeUTC,
      endTimeUTC
    );

    if (overlap) {
      return res.status(409).json({
        error: "The employee is already booked at this time",
        details: {
          startTimeUTC,
          endTimeUTC,
          timezone: branch.timezone,
          conflictingAssignment: overlap
        },
      });
    }

    const checkWorkingDay = await WorkingDates.findOne({
      where: { staff_id: targetEmployeeId, work_date: assignmentDateUTC }
    });

    if (!checkWorkingDay || checkWorkingDay.is_day_off) {
      return res.status(400).json({ error: "The employee is not working on this day." });
    }

    const newAssignment = await Assignment.create({
      organization_id: organizationId,
      branch_id: branchId,
      assignment_date: assignmentDateUTC,
      start_time: startTimeUTC,
      end_time: endTimeUTC,
      client_id: client.id,
      client_snapshot: {
        first_name: client.first_name,
        last_name: client.last_name || null,
        phone_number: client.phone_number.replace(/\D+/g, ""),
      },
      employee_id: employee.id,
      employee_snapshot: {
        first_name: employee.first_name,
        last_name: employee.last_name || null,
        role: employee.role,
      },
      service_id: service.id!,
      service_snapshot: {
        name: service.name,
        price: service.price,
        duration: service.duration,
      },
      additional_services:
        additionalServicesList.length > 0
          ? additionalServicesList.map((s: ServiceInfo) => ({
            id: s.id,
            name: s.name,
            price: s.price,
            duration: s.duration,
          }))
          : null,
      status: "new",
      notes: notes || null,
      source: source || "manual",
      discount: discountValue,
      final_price: finalPrice,
      total_duration: totalDuration,
      payment_method: null,
      paid: "unpaid",
      timezone: branch.timezone,
    });

    clientActivityEvents.emitAssignmentCreated({
      assignment: newAssignment,
      token: finalToken,
      organizationPerson: isOrganizationPerson,
    });

    return res.status(201).json({
      success: true,
      data: newAssignment,
      message: "Assignment created successfully",
    });

  } catch (error) {
    console.error("Error creating assignment:", error);
    next(error);
  }
};

export const editAssignmentBasic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const client = req.client;
    const token = req.headers.authorization?.split(" ")[1];

    const assignment = await Assignment.findByPk(id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (assignment.paid === "paid") {
      return res.status(403).json({
        error: "Cannot edit an assignment that has been paid."
      });
    }

    if (user.role === "employee" && assignment.employee_id !== user.id) {
      return res.status(403).json({
        error: "Access denied. You can edit only your assignments."
      });
    }

    if (client && client.id !== assignment.client_id) {
      return res.status(400).json({
        error: "You cannot view someone else's entry. You cannot change someone else's entry."
      });
    }

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
    } = req.body;

    const updates: any = {};

    if (status !== undefined) {
      if (!ASSIGNMENT_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      updates.status = status;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    const isOnlyBasicUpdate =
      (status !== undefined || notes !== undefined) &&
      !service &&
      !additionalServices &&
      !startTime &&
      !endTime &&
      !assignmentDate &&
      !employeeId &&
      discount == null;

    if (isOnlyBasicUpdate) {
      await assignment.update(updates);

      clientActivityEvents.emitAssignmentUpdated({
        assignment,
        token,
      });

      return res.json({
        success: true,
        message: "Assignment updated",
        data: assignment
      });
    }

    let targetEmployeeId = assignment.employee_id;

    if (employeeId !== undefined) {
      const employee = await OrganizationStaff.findByPk(employeeId);

      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      updates.employee_id = employee.id;
      updates.employee_snapshot = {
        first_name: employee.first_name,
        last_name: employee.last_name || null,
        role: employee.role,
      };

      targetEmployeeId = employee.id;
    }


    let totalPrice = 0;
    let totalDuration = 0;

    if (service !== undefined) {
      const normalized = {
        ...service,
        price: transformPrices(service.price),
      };

      updates.service_id = service.id;
      updates.service_snapshot = {
        name: normalized.name,
        price: normalized.price,
        duration: normalized.duration,
      };

      totalPrice += normalized.price;
      totalDuration += normalized.duration;
    } else {
      totalPrice += assignment.service_snapshot?.price || 0;
      totalDuration += assignment.service_snapshot?.duration || 0;
    }

    if (additionalServices !== undefined) {
      if (Array.isArray(additionalServices) && additionalServices.length > 0) {
        const normalizedAdditional = additionalServices.map((s) => ({
          id: s.id,
          name: s.name,
          price: transformPrices(s.price),
          duration: s.duration,
        }));

        updates.additional_services = normalizedAdditional;

        for (const s of normalizedAdditional) {
          totalPrice += s.price;
          totalDuration += s.duration;
        }
      } else {
        updates.additional_services = null;
      }
    } else {
      const existingAdditional = assignment.additional_services;
      if (Array.isArray(existingAdditional) && existingAdditional.length > 0) {
        for (const s of existingAdditional) {
          totalPrice += s.price || 0;
          totalDuration += s.duration || 0;
        }
      }
    }

    const discountValue = discount !== undefined
      ? Math.max(0, Math.min(100, discount))
      : (assignment.discount ?? 0);

    updates.discount = discountValue;
    updates.final_price = Math.max(
      0,
      Math.round(totalPrice - (totalPrice * discountValue) / 100)
    );
    updates.total_duration = totalDuration;


    const isTimeChange = startTime !== undefined || endTime !== undefined || assignmentDate !== undefined;

    if (isTimeChange) {
      const timezone = assignment.timezone || 'UTC';

      const baseDate = assignmentDate !== undefined
        ? DateTime.fromISO(assignmentDate, { zone: timezone })
        : DateTime.fromJSDate(assignment.assignment_date, { zone: timezone }).startOf("day");

      if (!baseDate.isValid) {
        return res.status(400).json({
          error: "Invalid assignment date format",
          details: baseDate.invalidReason
        });
      }

      let startDateTime: DateTime;

      if (startTime !== undefined) {
        startDateTime = DateTime.fromISO(
          `${baseDate.toISODate()}T${startTime}`,
          { zone: timezone }
        ).toUTC();
      } else {
        startDateTime = DateTime.fromISO(
          `${baseDate.toISODate()}T${assignment.start_time}`,
          { zone: "utc" }
        );
      }

      if (!startDateTime.isValid) {
        return res.status(400).json({
          error: "Invalid start time format",
          details: startDateTime.invalidReason
        });
      }

      let endDateTime;
      if (endTime !== undefined) {
        endDateTime = DateTime.fromISO(
          `${baseDate.toISODate()}T${endTime}`,
          { zone: timezone }
        );
      } else {
        endDateTime = startDateTime.plus({ minutes: totalDuration });
      }

      if (!endDateTime.isValid) {
        return res.status(400).json({
          error: "Invalid end time format",
          details: endDateTime.invalidReason
        });
      }

      if (endDateTime <= startDateTime) {
        return res.status(400).json({
          error: "End time cannot be earlier than start time",
        });
      }

      const assignmentDateUTC = startDateTime.startOf("day").toUTC().toJSDate();
      const startTimeUTC = startDateTime.toUTC().toFormat("HH:mm");
      const endTimeUTC = endDateTime.toUTC().toFormat("HH:mm");

      const overlap = await Assignment.findOne({
        where: {
          id: { [Op.ne]: assignment.id },
          employee_id: targetEmployeeId,
          branch_id: assignment.branch_id,
          assignment_date: assignmentDateUTC,
          status: { [Op.notIn]: ["canceled", "completed"] },
          [Op.and]: [
            {
              start_time: {
                [Op.lt]: endTimeUTC,
              },
            },
            {
              end_time: {
                [Op.gt]: startTimeUTC,
              },
            },
          ],
        },
      });

      if (overlap) {
        return res.status(409).json({
          error: "Employee is already booked during this time",
          details: {
            conflictingAssignmentId: overlap.id,
            start_time: overlap.start_time,
            end_time: overlap.end_time,
            date: overlap.assignment_date,
          },
        });
      }

      const workingDay = await WorkingDates.findOne({
        where: {
          staff_id: targetEmployeeId,
          work_date: startDateTime
            .setZone(timezone)
            .startOf("day")
            .toJSDate(),
        },
      });

      console.log(assignmentDateUTC);

      if (!workingDay || workingDay.is_day_off) {
        return res.status(400).json({
          error: "The employee is not working on this day.",
        });
      }

      updates.assignment_date = assignmentDateUTC;
      updates.start_time = startTimeUTC;
      updates.end_time = endTimeUTC;
    }

    await assignment.update(updates);

    clientActivityEvents.emitAssignmentUpdated({
      assignment,
      token,
    });

    return res.json({
      success: true,
      message: "Assignment updated successfully",
      data: assignment,
    });

  } catch (error) {
    next(error);
  }
};

export const payAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization!.split(" ")[1]!;
    const assignment = await Assignment.findByPk(id);
    const user = req.user;

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.paid === "paid" || assignment.paid === "refund") {
      return res.status(400).json({ message: "Paid or returned assignments cannot be edited" });
    }

    const { paymentMethod, discount, certificateNumber, status } = req.body;

    if (!paymentMethod?.length) {
      return res.status(400).json({ error: "Payment method is required" });
    }

    const totalPaid = paymentMethod.reduce((sum: number, m: any) => {
      const amount = transformPrices(m.amount);
      return sum + amount;
    }, 0);

    const discountValue = discount ?? assignment.discount ?? 0;
    const finalPrice = Math.max(0, Math.round(assignment.final_price - (assignment.final_price * discountValue) / 100));

    const updates: Partial<AssignmentAttributes> = {
      paid: "paid",
      discount: discountValue,
      payment_method: { methods: paymentMethod, total: totalPaid },
      final_price: finalPrice,
    };

    if (status) updates.status = status;

    await axios.post(
      `${octoApi}accounting?branch_id=${assignment.branch_id}`,
      {
        branch_id: assignment.branch_id,
        client_id: assignment.client_id,
        client_snapshot: assignment.client_snapshot,
        performed_by_id: assignment.employee_id,
        performed_by_snapshot: assignment.employee_snapshot,
        created_by_id: user?.id,
        created_by_snapshot: {
          first_name: user?.firstname,
          last_name: user?.lastname,
          role: user?.role,
        },
        source_type: "assignment",
        source_id: assignment.id,
        source_snapshot: {
          main_service: assignment.service_snapshot.name,
          additional_services: assignment.additional_services?.map(service => service.name),
          date: assignment.assignment_date,
          total_duration: assignment.total_duration,
        },
        payment_method: updates.payment_method?.methods,
        discount: updates.discount,
        date: DateTime.now().setZone(assignment.timezone).toUTC().toJSDate(),
        timezone: assignment.timezone,
        amount: finalPrice,
        status: "success",
        gift_certificate_number: certificateNumber,
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    await assignment.update(updates);
    clientActivityEvents.emitAssignmentUpdated({
      assignment,
      token,
    });

    return res.json({ message: "Assignment paid successfully", data: assignment });
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
    next(e);
  }
};

export const refundAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization!.split(" ")[1]!;
    const assignment = await Assignment.findByPk(id);

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.paid === "refund") {
      return res.status(400).json({ message: "Returned assignments cannot be edited" });
    }

    await axios.patch(
      `${octoApi}accounting/refund/${assignment.id}?branchId=${assignment.branch_id}`,
      {
        status: "refund",
        sourceType: "assignment",
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    await assignment.update({ paid: "refund" });

    clientActivityEvents.emitAssignmentUpdated({
      assignment,
      token,
    });

    return res.json({ message: "Assignment refunded successfully", data: assignment });
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
    next(e);
  }
};

export const deleteAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByPk(id);

    if (!assignment) {
      return res.status(400).json({ error: "Assignment not found" });
    }

    if (assignment.paid === "paid") {
      return res.status(400).json({ error: "You cannot delete a paid assignment." });
    }

    await assignment.destroy();
  } catch (e) {
    console.log("Delete assigment error", e);
    next(e);
  }
};
