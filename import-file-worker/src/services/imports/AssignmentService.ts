import type { ZapisiKzRecord } from "../../types";
import {
  type BranchInfo,
  type OrganizationStaffAttributes,
} from "../../../../src/modules/staff/models/OrganizationStaff";
import type { ClientInfo, Employee, OrganizationInfo } from "../../../../src/types";
import { normalizePhone, parseTime } from "../parsing/parsers/timeParser";
import Assignment, {
  type AssignmentStatus,
} from "../../../../src/modules/assignments/models/Assignment.ts";
import { Client } from "./ClientService.ts";

export class AssignmentService {

  async createFromImport(
    record: ZapisiKzRecord,
    branch: BranchInfo,
    organization: OrganizationInfo,
    client: Client,
    employee: OrganizationStaffAttributes,
    timezone: string
  ) {

    const timeInfo = parseTime(record.time, timezone);
    if (!timeInfo) throw new Error(`Invalid time: ${record.time}`);
    const { assignmentDate, startUTC, endUTC } = timeInfo;

    const exists = await this.checkDuplicate({
      organizationId: organization.id,
      branchId: branch.id,
      clientId: client.id,
      employeeId: employee.id,
      assignmentDate: timeInfo.assignmentDate,
      startTime: timeInfo.startUTC,
    });

    if (exists) {
      console.log(`⏭️ Duplicate assignment exists: ${exists.id}`);
      return exists;
    }

    return Assignment.create({
      branch_id: branch.id,
      organization_id: organization.id,
      chat_id: null,
      gift_certificate_number: null,
      client_id: client.id,
      client_snapshot: {
        first_name: record.clientName?.trim() || "Без имени",
        last_name: null,
        phone_number: normalizePhone(record.phoneNumber),
      },
      service_id: 0,
      service_snapshot: {
        id: 0,
        name: "Импортировано: услуга не указана",
        price: 0,
        duration: 0,
      },
      assignment_date: assignmentDate,
      start_time: startUTC,
      end_time: endUTC,
      employee_id: employee.id,
      employee_snapshot: {
        first_name: employee.first_name,
        last_name: employee.last_name,
        role: employee.role,
      },
      timezone,
      status: record.status,
      additional_services: [],
      notes: null,
      source: record.source || "ZAPISIKZ",
      discount: 0,
      final_price: 0,
      total_duration: 0,
      payment_method: null,
      paid: "unpaid",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  }

  private async checkDuplicate(criteria: {
    organizationId: number;
    branchId: number;
    clientId: string;
    employeeId: number;
    assignmentDate: Date;
    startTime: string;
  }) {
    return Assignment.findOne({
      where: {
        organization_id: criteria.organizationId,
        branch_id: criteria.branchId,
        client_id: criteria.clientId,
        employee_id: criteria.employeeId,
        assignment_date: criteria.assignmentDate,
        start_time: criteria.startTime,
      },
    });
  }

  private async create(data: {
    organizationId: number;
    branchId: number;
    clientId: string;
    employeeId: number;
    clientSnapshot: ClientInfo;
    employeeSnapshot: Employee;
    timeInfo: { assignmentDate: Date; startUTC: string; endUTC: string };
    status: AssignmentStatus;
    source: string;
    timezone?: string;
  }) {
    return Assignment.create({
      branch_id: data.branchId,
      organization_id: data.organizationId,
      client_id: data.clientId,
      client_snapshot: data.clientSnapshot,
      employee_id: data.employeeId,
      employee_snapshot: data.employeeSnapshot,
      assignment_date: data.timeInfo.assignmentDate,
      start_time: data.timeInfo.startUTC,
      end_time: data.timeInfo.endUTC,
      status: data.status,
      source: data.source,
      service_id: 0,
      service_snapshot: {
        id: 0,
        name: "Импортировано: услуга не указана",
        price: 0,
        duration: 0,
      },
      timezone: data.timezone || "Asia/Bishkek",
      additional_services: [],
      discount: 0,
      final_price: 0,
      total_duration: 0,
      payment_method: null,
      paid: "unpaid",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}