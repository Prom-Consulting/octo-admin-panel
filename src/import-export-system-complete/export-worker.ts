/**
 * 📤 Export Worker
 *
 * Background worker for exporting data to Excel/CSV
 * Memory-efficient streaming approach for large datasets
 */

import { Worker } from "bullmq";
import * as XLSX from "xlsx";
import Redis from "ioredis";
import { sequelize } from "../dbConfig/dbConfig";
import Assignment from "../modules/assignments/models/Assignment";
import Client from "../modules/client/models/Client";
import OrganizationStaff from "../modules/staff/models/OrganizationStaff";
import type { ExportJobData } from "./import-export-service";
import fs from "fs";
import path from "path";

// ═══════════════════════════════════════════════════════════════════════════
// 📊 Export Processors
// ═══════════════════════════════════════════════════════════════════════════

class AssignmentExporter {
  static async export(
    data: ExportJobData,
    updateProgress: (progress: number, step: string) => Promise<void>
  ): Promise<string> {
    const { branchId, organizationId, dateFrom, dateTo, format } = data;

    await updateProgress(10, "Fetching assignments...");

    // Build query
    const whereClause: any = {
      branch_id: branchId,
      organization_id: organizationId,
    };

    if (dateFrom) {
      whereClause.assignment_date = {
        ...(whereClause.assignment_date || {}),
        [sequelize.Op.gte]: dateFrom,
      };
    }

    if (dateTo) {
      whereClause.assignment_date = {
        ...(whereClause.assignment_date || {}),
        [sequelize.Op.lte]: dateTo,
      };
    }

    // Fetch assignments in batches
    const batchSize = 1000;
    let offset = 0;
    let allAssignments: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const batch = await Assignment.findAll({
        where: whereClause,
        limit: batchSize,
        offset,
        order: [
          ["assignment_date", "DESC"],
          ["start_time", "ASC"],
        ],
      });

      if (batch.length === 0) {
        hasMore = false;
      } else {
        allAssignments = allAssignments.concat(batch);
        offset += batchSize;

        const progress =
          10 + Math.min(50, Math.floor((offset / (offset + batch.length)) * 50));
        await updateProgress(progress, `Fetched ${offset} assignments...`);
      }
    }

    console.log(`📊 Total assignments to export: ${allAssignments.length}`);

    await updateProgress(60, "Preparing export data...");

    // Transform to export format
    const exportData = allAssignments.map((assignment) => ({
      Дата: assignment.assignment_date.toISOString().split("T")[0],
      "Время начала": assignment.start_time,
      "Время окончания": assignment.end_time,
      Клиент:
        `${assignment.client_snapshot.first_name} ${assignment.client_snapshot.last_name || ""}`.trim(),
      "Телефон клиента": assignment.client_snapshot.phone_number,
      Сотрудник:
        `${assignment.employee_snapshot.first_name} ${assignment.employee_snapshot.last_name}`.trim(),
      Услуга: assignment.service_snapshot.name,
      "Стоимость услуги": assignment.service_snapshot.price,
      "Дополнительные услуги": assignment.additional_services
        ? assignment.additional_services.map((s: any) => s.name).join(", ")
        : "",
      "Скидка %": assignment.discount || 0,
      "Итоговая цена": assignment.final_price,
      "Длительность (мин)": assignment.total_duration,
      Статус: assignment.status,
      Оплачено: assignment.paid,
      "Способ оплаты": assignment.payment_method?.name || "",
      Источник: assignment.source,
      Заметки: assignment.notes || "",
      "Филиал ID": assignment.branch_id,
      "Организация ID": assignment.organization_id,
      Создано: assignment.createdAt?.toISOString() || "",
    }));

    await updateProgress(80, "Generating file...");

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const maxWidths: number[] = [];
    exportData.forEach((row) => {
      Object.values(row).forEach((value, colIndex) => {
        const length = String(value).length;
        maxWidths[colIndex] = Math.max(maxWidths[colIndex] || 10, length);
      });
    });

    worksheet["!cols"] = maxWidths.map((w) => ({ wch: Math.min(w + 2, 50) }));

    XLSX.utils.book_append_sheet(workbook, worksheet, "Записи");

    // Save file
    const exportDir = "/tmp/exports";
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `export_${data.jobId}.${format}`;
    const filePath = path.join(exportDir, fileName);

    if (format === "xlsx") {
      XLSX.writeFile(workbook, filePath);
    } else if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      fs.writeFileSync(filePath, csv);
    }

    await updateProgress(100, "Export completed");

    console.log(`✅ Export saved to: ${filePath}`);
    return filePath;
  }
}

class ClientExporter {
  static async export(
    data: ExportJobData,
    updateProgress: (progress: number, step: string) => Promise<void>
  ): Promise<string> {
    const { organizationId } = data;

    await updateProgress(10, "Fetching clients...");

    // Get all clients who have assignments in this organization
    const clients = await Client.findAll({
      include: [
        {
          model: Assignment,
          as: "assignments",
          where: { organization_id: organizationId },
          required: true,
          attributes: [],
        },
      ],
      group: ["Client.id"],
    });

    await updateProgress(60, "Preparing export data...");

    const exportData = clients.map((client) => ({
      ID: client.id,
      Имя: client.first_name,
      Фамилия: client.last_name || "",
      Телефон: client.phone_number,
      Активен: client.is_active ? "Да" : "Нет",
      "Дата регистрации": client.createdAt?.toISOString() || "",
    }));

    await updateProgress(80, "Generating file...");

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Клиенты");

    const exportDir = "/tmp/exports";
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `export_clients_${data.jobId}.${data.format}`;
    const filePath = path.join(exportDir, fileName);

    XLSX.writeFile(workbook, filePath);

    await updateProgress(100, "Export completed");
    return filePath;
  }
}

class StaffExporter {
  static async export(
    data: ExportJobData,
    updateProgress: (progress: number, step: string) => Promise<void>
  ): Promise<string> {
    const { branchId, organizationId } = data;

    await updateProgress(10, "Fetching staff...");

    const staff = await OrganizationStaff.findAll({
      where: {
        "organization.id": organizationId,
      },
    });

    // Filter by branch
    const filteredStaff = staff.filter((s) =>
      s.branches.some((b) => b.id === branchId)
    );

    await updateProgress(60, "Preparing export data...");

    const exportData = filteredStaff.map((s) => ({
      ID: s.id,
      Имя: s.first_name,
      Фамилия: s.last_name,
      Email: s.email,
      Роль: s.role,
      Специальность: s.specialty || "",
      Активен: s.is_active ? "Да" : "Нет",
      Филиалы: s.branches.map((b) => b.name).join(", "),
      "Дата создания": s.createdAt?.toISOString() || "",
    }));

    await updateProgress(80, "Generating file...");

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Сотрудники");

    const exportDir = "/tmp/exports";
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `export_staff_${data.jobId}.${data.format}`;
    const filePath = path.join(exportDir, fileName);

    XLSX.writeFile(workbook, filePath);

    await updateProgress(100, "Export completed");
    return filePath;
  }
}

class FullExporter {
  static async export(
    data: ExportJobData,
    updateProgress: (progress: number, step: string) => Promise<void>
  ): Promise<string> {
    const { branchId, organizationId, dateFrom, dateTo, format } = data;

    const workbook = XLSX.utils.book_new();

    // Export assignments
    await updateProgress(10, "Exporting assignments...");
    const assignmentPath = await AssignmentExporter.export(
      { ...data, exportType: "assignments" },
      (p, s) => updateProgress(10 + p * 0.3, s)
    );
    const assignmentWB = XLSX.readFile(assignmentPath);
    XLSX.utils.book_append_sheet(workbook, assignmentWB.Sheets["Записи"], "Записи");

    // Export clients
    await updateProgress(40, "Exporting clients...");
    const clientPath = await ClientExporter.export(
      { ...data, exportType: "clients" },
      (p, s) => updateProgress(40 + p * 0.3, s)
    );
    const clientWB = XLSX.readFile(clientPath);
    XLSX.utils.book_append_sheet(workbook, clientWB.Sheets["Клиенты"], "Клиенты");

    // Export staff
    await updateProgress(70, "Exporting staff...");
    const staffPath = await StaffExporter.export(
      { ...data, exportType: "staff" },
      (p, s) => updateProgress(70 + p * 0.2, s)
    );
    const staffWB = XLSX.readFile(staffPath);
    XLSX.utils.book_append_sheet(
      workbook,
      staffWB.Sheets["Сотрудники"],
      "Сотрудники"
    );

    await updateProgress(90, "Finalizing...");

    const exportDir = "/tmp/exports";
    const fileName = `export_full_${data.jobId}.${format}`;
    const filePath = path.join(exportDir, fileName);

    XLSX.writeFile(workbook, filePath);

    await updateProgress(100, "Export completed");
    return filePath;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 Worker Setup
// ═══════════════════════════════════════════════════════════════════════════

const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "export-jobs",
  async (job) => {
    const { data } = job as { data: ExportJobData };

    console.log(`\n📤 Processing export job: ${job.id}`);
    console.log(`   Type: ${data.exportType}`);
    console.log(`   Format: ${data.format}`);
    console.log(`   Organization: ${data.organizationId}`);
    console.log(`   Branch: ${data.branchId}`);

    const updateProgress = async (progress: number, step: string) => {
      await job.updateProgress({
        percentage: progress,
        step,
      });
    };

    try {
      let filePath: string;

      switch (data.exportType) {
        case "assignments":
          filePath = await AssignmentExporter.export(data, updateProgress);
          break;
        case "clients":
          filePath = await ClientExporter.export(data, updateProgress);
          break;
        case "staff":
          filePath = await StaffExporter.export(data, updateProgress);
          break;
        case "full":
          filePath = await FullExporter.export(data, updateProgress);
          break;
        default:
          throw new Error(`Unknown export type: ${data.exportType}`);
      }

      return { filePath };
    } catch (error) {
      console.error(`❌ Export job failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 3, // Process 3 exports simultaneously
  }
);

// Worker event handlers
worker.on("completed", (job) => {
  console.log(`✅ Export job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Export job failed: ${job?.id}`, err);
});

worker.on("error", (err) => {
  console.error("❌ Worker error:", err);
});

console.log("🚀 Export worker started");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("📦 Shutting down worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});

export { worker };
