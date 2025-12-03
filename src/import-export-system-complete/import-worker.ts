/**
 * 🔄 Import Worker
 *
 * Background worker for processing import jobs
 * Runs in separate process, doesn't block main thread
 */

import { Worker } from "bullmq";
import * as XLSX from "xlsx";
import Redis from "ioredis";
import { sequelize } from "../dbConfig/dbConfig";
import Assignment from "../modules/assignments/models/Assignment";
import Client from "../modules/client/models/Client";
import OrganizationStaff from "../modules/staff/models/OrganizationStaff";
import type { ImportJobData } from "./import-export-service";
import {
  generateClientId,
  normalizePhone,
  parseDate,
  BatchProcessor,
} from "./import-export-service";

// ═══════════════════════════════════════════════════════════════════════════
// 🗺️ Import Mappers by Type
// ═══════════════════════════════════════════════════════════════════════════

interface DIKIDIRow {
  Дата: string;
  Время: string;
  Клиент: string;
  Телефон: string;
  Мастер: string;
  Услуга: string;
  Стоимость: string | number;
}

interface ZAPISIKZRow {
  Дата: string;
  Время: string;
  Клиент: string;
  Телефон: string;
  Мастер: string;
  Услуга: string;
  Стоимость: string | number;
  Статус?: string;
  Источник?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 Import Processors
// ═══════════════════════════════════════════════════════════════════════════

class DIKIDIImporter {
  static async process(
    data: ImportJobData,
    updateProgress: (progress: number, step: string) => Promise<void>
  ) {
    const { filePath, branchId, organizationId, options } = data;
    const batchSize = options?.batchSize || 100;

    let stats = {
      totalRecords: 0,
      processedRecords: 0,
      clientsCreated: 0,
      staffCreated: 0,
      assignmentsCreated: 0,
      errors: [] as string[],
    };

    // Step 1: Parse Excel
    await updateProgress(10, "Parsing Excel file...");
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: DIKIDIRow[] = XLSX.utils.sheet_to_json(sheet, { raw: false });
    stats.totalRecords = rows.length;

    console.log(`📊 Found ${rows.length} records in DIKIDI file`);

    // Step 2: Extract unique masters and clients
    await updateProgress(20, "Extracting masters and clients...");
    const uniqueMasters = new Map<string, { name: string; phone?: string }>();
    const uniqueClients = new Map<string, { name: string; phone: string }>();

    for (const row of rows) {
      const masterName = row["Мастер"]?.trim();
      const clientName = row["Клиент"]?.trim();
      const clientPhone = normalizePhone(row["Телефон"] || "");

      if (masterName && !uniqueMasters.has(masterName)) {
        uniqueMasters.set(masterName, { name: masterName });
      }

      if (clientPhone && !uniqueClients.has(clientPhone)) {
        uniqueClients.set(clientPhone, { name: clientName, phone: clientPhone });
      }
    }

    console.log(
      `👥 Found ${uniqueMasters.size} unique masters, ${uniqueClients.size} unique clients`
    );

    // Step 3: Create/Find Masters (Staff)
    await updateProgress(30, "Creating masters...");
    const masterMap = new Map<string, number>(); // masterName -> staff.id

    for (const [masterName, masterData] of uniqueMasters) {
      try {
        // Try to find existing staff
        let staff = await OrganizationStaff.findOne({
          where: {
            first_name: masterName.split(" ")[0],
            last_name: masterName.split(" ").slice(1).join(" ") || "",
            // Check if branch exists in branches array
            branches: sequelize.literal(`branches @> '[{"id": ${branchId}}]'`),
          },
        });

        if (!staff) {
          // Create new staff member
          const [firstName, ...lastNameParts] = masterName.split(" ");
          staff = await OrganizationStaff.create({
            organization: { id: organizationId, name: "" }, // Will be updated
            branches: [{ id: branchId, name: "", address: "" }],
            first_name: firstName,
            last_name: lastNameParts.join(" ") || firstName,
            email: `${firstName.toLowerCase()}.${branchId}@imported.local`,
            password: "temporary_password", // Should be changed
            role: "employee",
            customRole: null,
            is_active: true,
          });
          stats.staffCreated++;
          console.log(`✅ Created master: ${masterName} (ID: ${staff.id})`);
        } else {
          console.log(`ℹ️ Found existing master: ${masterName} (ID: ${staff.id})`);
        }

        masterMap.set(masterName, staff.id);
      } catch (error) {
        console.error(`❌ Error creating master ${masterName}:`, error);
        stats.errors.push(`Failed to create master: ${masterName}`);
      }
    }

    // Step 4: Create/Find Clients
    await updateProgress(50, "Creating clients...");
    const clientMap = new Map<string, string>(); // phone -> client.id

    for (const [phone, clientData] of uniqueClients) {
      try {
        // Try to find existing client
        let client = await Client.findOne({
          where: { phone_number: phone },
        });

        if (!client) {
          // Create new client
          const clientId = generateClientId("dikidi", phone);
          const [firstName, ...lastNameParts] = clientData.name.split(" ");

          client = await Client.create({
            id: clientId,
            first_name: firstName || "Unknown",
            last_name: lastNameParts.join(" ") || null,
            phone_number: phone,
            password: "temporary_password", // Should be changed
            is_active: true,
            token: null,
          });
          stats.clientsCreated++;
          console.log(`✅ Created client: ${clientData.name} (ID: ${clientId})`);
        } else {
          console.log(
            `ℹ️ Found existing client: ${clientData.name} (ID: ${client.id})`
          );
        }

        clientMap.set(phone, client.id);
      } catch (error) {
        console.error(`❌ Error creating client ${clientData.name}:`, error);
        stats.errors.push(`Failed to create client: ${clientData.name}`);
      }
    }

    // Step 5: Import Assignments in batches
    await updateProgress(70, "Importing assignments...");

    const processAssignment = async (row: DIKIDIRow) => {
      try {
        const masterName = row["Мастер"]?.trim();
        const clientPhone = normalizePhone(row["Телефон"] || "");
        const clientName = row["Клиент"]?.trim();
        const serviceName = row["Услуга"]?.trim();
        const dateStr = row["Дата"];
        const timeStr = row["Время"];
        const price =
          typeof row["Стоимость"] === "number"
            ? row["Стоимость"]
            : parseFloat(String(row["Стоимость"]).replace(/[^\d.]/g, "")) || 0;

        // Get IDs
        const employeeId = masterMap.get(masterName);
        const clientId = clientMap.get(clientPhone);

        if (!employeeId) {
          throw new Error(`Master not found: ${masterName}`);
        }
        if (!clientId) {
          throw new Error(`Client not found: ${clientPhone}`);
        }

        // Parse date
        const assignmentDate = parseDate(dateStr);
        if (!assignmentDate) {
          throw new Error(`Invalid date: ${dateStr}`);
        }

        // Check for duplicates if needed
        if (options?.skipDuplicates) {
          const existing = await Assignment.findOne({
            where: {
              branch_id: branchId,
              assignment_date: assignmentDate,
              start_time: timeStr,
              employee_id: employeeId,
            },
          });

          if (existing) {
            console.log(
              `⏭️ Skipping duplicate: ${dateStr} ${timeStr} - ${masterName}`
            );
            return;
          }
        }

        // Create assignment
        const [firstName, ...lastNameParts] = clientName.split(" ");

        await Assignment.create({
          organization_id: organizationId,
          branch_id: branchId,
          client_id: clientId,
          client_snapshot: {
            id: clientId,
            first_name: firstName || "Unknown",
            last_name: lastNameParts.join(" ") || null,
            phone_number: clientPhone,
          },
          employee_id: employeeId,
          employee_snapshot: {
            id: employeeId,
            first_name: masterName.split(" ")[0],
            last_name: masterName.split(" ").slice(1).join(" ") || "",
          },
          service_id: 0, // Temporary, should be mapped
          service_snapshot: {
            id: 0,
            name: serviceName,
            price: price,
            duration: 60, // Default duration
          },
          assignment_date: assignmentDate,
          start_time: timeStr,
          end_time: timeStr, // Should calculate based on duration
          status: "completed",
          source: "dikidi_import",
          final_price: price,
          total_duration: 60,
          paid: "unpaid",
          timezone: "Asia/Bishkek",
        });

        stats.assignmentsCreated++;
        stats.processedRecords++;
      } catch (error) {
        console.error(`❌ Error importing row:`, error);
        stats.errors.push(
          `Row error: ${error instanceof Error ? error.message : "Unknown"}`
        );
      }
    };

    // Process in batches
    const batchResults = await BatchProcessor.processBatch(rows, processAssignment, {
      batchSize,
      concurrency: 5,
      onProgress: (processed, total) => {
        const progress = 70 + Math.floor((processed / total) * 25);
        updateProgress(progress, `Processing assignments: ${processed}/${total}`);
      },
    });

    await updateProgress(95, "Finalizing...");

    // Final stats
    console.log("\n📊 DIKIDI Import Summary:");
    console.log(`   Total Records: ${stats.totalRecords}`);
    console.log(`   Clients Created: ${stats.clientsCreated}`);
    console.log(`   Staff Created: ${stats.staffCreated}`);
    console.log(`   Assignments Created: ${stats.assignmentsCreated}`);
    console.log(`   Errors: ${stats.errors.length}`);

    await updateProgress(100, "Completed");

    return stats;
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
  "import-jobs",
  async (job) => {
    const { data } = job as { data: ImportJobData };

    console.log(`\n🔄 Processing import job: ${job.id}`);
    console.log(`   Type: ${data.importType}`);
    console.log(`   Organization: ${data.organizationId}`);
    console.log(`   Branch: ${data.branchId}`);

    // Update progress helper
    const updateProgress = async (progress: number, step: string) => {
      await job.updateProgress({
        percentage: progress,
        step,
        processed: 0,
        total: 0,
      });
    };

    try {
      let result;

      switch (data.importType) {
        case "dikidi":
          result = await DIKIDIImporter.process(data, updateProgress);
          break;
        case "zapisikz":
          const { ZAPISIKZImporter } = await import("./zapisikz-importer");
          result = await ZAPISIKZImporter.process(data, updateProgress);
          break;
        case "altegio":
          const { AltegioImporter } = await import("./altegio-importer");
          result = await AltegioImporter.process(data, updateProgress);
          break;
        default:
          throw new Error(`Unknown import type: ${data.importType}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Import job failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 imports simultaneously
    limiter: {
      max: 5, // Max 5 jobs per...
      duration: 60000, // ...60 seconds
    },
  }
);

// Worker event handlers
worker.on("completed", (job) => {
  console.log(`✅ Import job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Import job failed: ${job?.id}`, err);
});

worker.on("error", (err) => {
  console.error("❌ Worker error:", err);
});

console.log("🚀 Import worker started");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("📦 Shutting down worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});

export { worker };
