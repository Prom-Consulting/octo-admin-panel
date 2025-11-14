import type { NextFunction, Request, Response } from "express";
import { Op, type WhereOptions } from "sequelize";
import Assignment, {
  ASSIGMENT_PAID,
  ASSIGMENT_PAID_METHOD,
  ASSIGNMENT_STATUSES,
  type AssignmentAttributes,
} from "../models/Assignment.ts";
import getDayRange from "../../../utils /getDayRange.ts";
import Client from "../../client/Client.ts";
import OrganizationStaff from "../../staff/models/OrganizationStaff.ts";
import transformPrices from "../../../utils /transformPrices.ts";
import { DateTime } from "luxon";
import { checkTimeOverlap } from "../checkTimeOverlap.ts";
import type { ServiceInfo } from "../../../types";
import User from "../../user/models/User.ts";
import axios from "axios";
import { octoApi } from "../../../constants/urls.ts";
import { getBranchAndOrganization } from "../../../utils /getBranchAndOrganization.ts";

export const getListAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { employeeId, clientId, date } = req.query;
    const user = req.user;
    const where: WhereOptions<Assignment> = {};

    const { branch } = await getBranchAndOrganization(req, { branch: true });

    if (user?.role === "employee") {
      where.employee_id = user.id;
    } else {
      if (employeeId) where.employee_id = Number(employeeId);
    }

    if (clientId) where.client_id = Number(clientId);
    if (branch) where.branch_id = branch.id;

    if (date) {
      const tz = branch.timezone || "UTC";
      const { startOfDay, endOfDay } = getDayRange(date as string, date as string, tz);
      where.assignment_date = { [Op.between]: [startOfDay, endOfDay] };
    }

    const assignments = await Assignment.findAll({ where });
    res.send(assignments);
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
    const assignment = await Assignment.findOne({
      where: { id, branch_id: Number(branch.id) }
    });

    if (!assignment) {
      return res.status(404).send({ error: "No Assignment found with this id" });
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
      clientId,
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
    const { branch, organization } = await getBranchAndOrganization(req, { required: true });

    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
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

    const discountValue = discount || 0;

    const normalizePrice = (s: ServiceInfo) => ({
      ...s,
      price: transformPrices(s.price),
    });

    const normalizedService = normalizePrice(service);
    const normalizedAdditional = Array.isArray(additionalServices)
      ? additionalServices.map(normalizePrice)
      : [];

    const totalPrice =
      normalizedService.price +
      normalizedAdditional.reduce((sum: number, s: ServiceInfo) => sum + s.price, 0);

    const totalDuration =
      service.duration +
      normalizedAdditional.reduce(
        (sum: number, s: ServiceInfo) => sum + s.duration,
        0
      );

    const finalPrice = Math.max(
      0,
      Math.round(totalPrice - (totalPrice * discountValue) / 100)
    );

    const startDateTime = DateTime.fromISO(`${assignmentDate}T${startTime}`, {
      zone: branch.timezone,
    });

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
        details: { startTimeUTC, endTimeUTC, timezone: branch.timezone },
      });
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
      additional_services:
        additionalServices && normalizedAdditional.length > 0
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
};

export const editAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const assignment = await Assignment.findByPk(id);
    const token = req.headers.authorization!.split(" ")[1];

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

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
      certificateNumber,
    } = req.body;

    if (status && !ASSIGNMENT_STATUSES.includes(status as any)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    if (status) updates.status = status;
    if (notes) updates.notes = notes;

    if (employeeId) {
      const employee = await OrganizationStaff.findByPk(employeeId);
      if (!employee) return res.status(404).json({ error: "Employee not found" });
      updates.employee_id = employeeId;
      updates.employee_snapshot = {
        first_name: employee.first_name,
        last_name: employee.last_name || null,
        role: employee.role,
      };
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

    const currentDate = assignmentDate
      ? DateTime.fromISO(assignmentDate, { zone: assignment.timezone })
      : DateTime.fromJSDate(assignment.assignment_date, { zone: "utc" }).setZone(assignment.timezone).startOf("day");

    const startDateTime = DateTime.fromISO(`${currentDate.toISODate()}T${startTime ?? assignment.start_time}`, {
      zone: assignment.timezone,
    });

    let endDateTime = DateTime.fromISO(`${currentDate.toISODate()}T${endTime ?? assignment.end_time}`, {
      zone: assignment.timezone,
    });

    if (!endTime) endDateTime = startDateTime.plus({ minutes: totalDuration });
    if (endDateTime <= startDateTime) {
      return res.status(400).json({ error: "End time cannot be earlier than start time" });
    }

    if (assignmentDate) updates.assignment_date = startDateTime.toUTC().toJSDate();
    if (startTime) updates.start_time = startDateTime.toUTC().toFormat("HH:mm");
    if (endTime) updates.end_time = endDateTime.toUTC().toFormat("HH:mm");

    const normalizedAdditional = Array.isArray(additionalServices)
      ? additionalServices.map((s) => ({ ...s, price: transformPrices(s.price) }))
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
    updates.final_price = Math.max(0, Math.round(totalPrice - (totalPrice * discountValue) / 100));
    updates.total_duration = totalDuration;

    const userDb = await User.findByPk(user.id);
    if (!userDb) return res.status(404).json({ error: "User not found" });
    updates.manager_id = userDb.id;
    updates.manager_snapshot = {
      first_name: userDb.first_name,
      last_name: userDb.last_name || null,
      role: userDb.role,
    };

    if (paid) {
      if (!ASSIGMENT_PAID.includes(paid as any)) {
        return res.status(400).json({ error: "Invalid paid value" });
      }
      updates.paid = paid;
      if (paid !== "refund" && (!paymentMethod || !ASSIGMENT_PAID_METHOD.includes(paymentMethod[0]?.type))) {
        return res.status(400).json({ error: "Payment method required when marking as paid" });
      }
    }

    if (paid === "refund") {
      try {
        await axios.patch(
          `http://localhost:3000/accounting/refund/${assignment.id}?branch_id=${assignment.branch_id}`,
          {
            status: "refund",
            sourceType: "assignment"
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

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    if (paid === "paid") {
      const client = assignment.client_snapshot;
      const performedBy = assignment.employee_snapshot; // мастер (исполнитель)
      const createdBySnap = updates.manager_snapshot;   // кто оформил (кассир/админ)

      if (
        !paymentMethod?.length ||
        !assignment.total_duration ||
        !updates.final_price
      ) {
        return res
          .status(400)
          .send({ error: "Missing required fields for accounting" });
      }

      let discountValue = discount ?? assignment.discount ?? 0;
      // let giftCertificateSnapshot: CertificateInfo | null = null;
      // let giftCertificateId: number | null = null;

      let totalPaid = 0;

      for (const method of paymentMethod) {
        if (method.type === "gift_certificate") {
          if (!certificateNumber) {
            return res
              .status(400)
              .send({ error: "Gift certificate number is required" });
          }
        }

        //
        //   const { data: certificateData } = await axios.get(
        //     `${octoApi}gift-certificates/${certificateNumber}`,
        //     {
        //       headers: {
        //         authorization: `Bearer ${token}`,
        //         "Content-Type": "application/json",
        //       },
        //     }
        //   );
        //
        //   const certificate = certificateData;
        //
        //   const nowUtc = DateTime.now().toUTC();
        //   const expiryUtc = DateTime.fromJSDate(certificate.expiry_date).toUTC();
        //
        //   if (nowUtc > expiryUtc) {
        //     return res.status(400).send({ error: "Gift certificate has expired" });
        //   }
        //
        //   discountValue = certificate.discount;
        //
        //   giftCertificateSnapshot = {
        //     certificate_number: certificate.certificate_number,
        //     amount: certificate.amount,
        //     discount: certificate.discount,
        //     expiry_date: certificate.expiry_date,
        //   };
        //   giftCertificateId = certificate.id;
        //
        //   method.amount = certificate.amount;
        // } else {
        //   method.amount = transformPrices(method.amount);
        // }

        if (method.amount) {
          method.amount = method.type === "gift_certificate" ? method.amount : transformPrices(method.amount);
          totalPaid += method.amount;
        }
        if (!method.name) method.name = null;
      }

      updates.payment_method = { methods: [...paymentMethod], total: totalPaid };

      const finalPrice = Math.max(
        0,
        Math.round(totalPrice - (totalPrice * discountValue) / 100)
      );

      updates.discount = discountValue;
      updates.final_price = finalPrice;
      updates.total_duration = assignment.total_duration;

      const newAccounting = {
        branch_id: assignment.branch_id,
        client_id: assignment.client_id,
        client_snapshot: {
          first_name: client.first_name,
          last_name: client.last_name || null,
          phone: client.phone,
        },
        performed_by_id: assignment.employee_id,
        performed_by_snapshot: performedBy,
        created_by_id: updates.manager_id,
        created_by_snapshot: createdBySnap,
        source_type: "assignment",
        source_id: assignment.id,
        source_snapshot: {
          main_service: assignment.service_snapshot.name,
          additional_services: assignment.additional_services?.map(service => service.name),
          date: assignment.assignment_date,
          total_duration: assignment.total_duration,
        },
        payment_method: updates.payment_method?.methods,
        discount: discountValue,
        date: DateTime.now().setZone(assignment.timezone).toUTC().toJSDate(),
        timezone: assignment.timezone,
        amount: finalPrice,
        status: "success",
        gift_certificate_number: certificateNumber,
        // gift_certificate_snapshot: giftCertificateSnapshot,
      };

      await axios.post(
        `${octoApi}accounting?branch_id=${assignment.branch_id}`,
        newAccounting,
        {
          headers: {
            authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      await assignment.update(updates);

      return res.json({
        message: `Assignment updated successfully. Created accounting`,
        assignment,
      });
    }

    await assignment.update(updates);

    // const assignmentUpdatedEvent = {
    //   assignmentId: assignment.id,
    //   branchId: assignment.branch_id,
    //   updates,
    //   paid,
    //   paymentMethod,
    //   userId: user.id,
    //   certificateNumber,
    // };

    return res.json({ message: "Assignment updated successfully", assignment });
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

export const editAssignmentBasic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const assignment = await Assignment.findByPk(id);

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (user.role === "employee" && assignment.employee_id !== user.id) {
      return res.status(403).json({ error: "Access denied. You can edit only your assignments." });
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

    const updates: Partial<AssignmentAttributes> = {};

    if (status && !ASSIGNMENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    if (status) updates.status = status;
    if (notes) updates.notes = notes;

    if (employeeId && user.role !== "employee") {
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
    }

    const normalizedAdditional = Array.isArray(additionalServices)
      ? additionalServices.map((s) => ({ ...s, price: transformPrices(s.price) }))
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
    updates.final_price = Math.max(0, Math.round(totalPrice - (totalPrice * discountValue) / 100));
    updates.total_duration = totalDuration;

    const currentDate = assignmentDate
      ? DateTime.fromISO(assignmentDate, { zone: assignment.timezone })
      : DateTime.fromJSDate(assignment.assignment_date, { zone: assignment.timezone }).startOf("day");

    const startDateTime = DateTime.fromISO(`${currentDate.toISODate()}T${startTime ?? assignment.start_time}`, {
      zone: assignment.timezone,
    });

    let endDateTime = DateTime.fromISO(`${currentDate.toISODate()}T${endTime ?? assignment.end_time}`, {
      zone: assignment.timezone,
    });

    if (!endTime) endDateTime = startDateTime.plus({ minutes: totalDuration });

    if (endDateTime <= startDateTime) {
      return res.status(400).json({ error: "End time cannot be earlier than start time" });
    }

    if (assignmentDate) updates.assignment_date = startDateTime.toUTC().toJSDate();
    if (startTime) updates.start_time = startDateTime.toUTC().toFormat("HH:mm");
    if (endTime) updates.end_time = endDateTime.toUTC().toFormat("HH:mm");

    await assignment.update(updates);

    return res.json({ message: "Assignment updated successfully", data: assignment });
  } catch (e) {
    next(e);
  }
};

export const payAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization!.split(" ")[1];
    const assignment = await Assignment.findByPk(id);
    const user = req.user;

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const { paymentMethod, discount, certificateNumber } = req.body;

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
    const token = req.headers.authorization!.split(" ")[1];
    const assignment = await Assignment.findByPk(id);

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

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
