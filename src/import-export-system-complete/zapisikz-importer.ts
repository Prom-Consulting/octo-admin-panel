/**
 * 🔄 ZAPISIKZ Importer
 *
 * Imports data from Zapisi.kz booking system
 * Supports Russian date formats and status mapping
 */

import * as XLSX from "xlsx";
import { sequelize } from "../dbConfig/dbConfig";
import Assignment from "../modules/assignments/models/Assignment";
import Client from "../modules/client/models/Client";
import OrganizationStaff from "../modules/staff/models/OrganizationStaff";
import type { ImportJobData } from "./import-export-service";
import { generateClientId, normalizePhone } from "./import-export-service";

// ═══════════════════════════════════════════════════════════════════════════
// 📋 Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

interface ZAPISIKZRow {
  Время: string; // "30 Октября, 18:40 - 20:00"
  "Автор записи"?: string; // "Гульбайра Тулькиева"
  Мастер: string; // "Таннура Мунарбекова"
  Клиент: string; // "Гулжан"
  Телефон: string; // "996772248411"
  Активность?: string; // "Постоянный", "Вторичный", "Первичный"
  Статус: string; // "Обслужен", "В ожидании", "Отменено"
  "Цвет записи"?: string; // "По умолчанию"
  Источник?: string; // "Партнерское приложение: WEB"
  "История изменений"?: string; // "30 Октября, 13:37"
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse Russian date format: "30 Октября, 18:40" or "30 Октября, 18:40 - 20:00"
 */
function parseRussianDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const monthMap: { [key: string]: number } = {
    января: 0,
    февраля: 1,
    марта: 2,
    апреля: 3,
    мая: 4,
    июня: 5,
    июля: 6,
    августа: 7,
    сентября: 8,
    октября: 9,
    ноября: 10,
    декабря: 11,
    // Alternate forms
    январь: 0,
    февраль: 1,
    март: 2,
    апрель: 3,
    май: 4,
    июнь: 5,
    июль: 6,
    август: 7,
    сентябрь: 8,
    октябрь: 9,
    ноябрь: 10,
    декабрь: 11,
  };

  // Extract: "30 Октября, 18:40"
  const match = dateStr.match(/(\d+)\s+([а-яА-Я]+)\s*,?\s*(\d+):(\d+)/i);

  if (!match) {
    console.warn(`⚠️ Could not parse date: "${dateStr}"`);
    return null;
  }

  const day = parseInt(match[1]);
  const monthStr = match[2].toLowerCase();
  const month = monthMap[monthStr];
  const hours = parseInt(match[3]);
  const mins = parseInt(match[4]);

  if (month === undefined) {
    console.warn(`⚠️ Unknown month: "${monthStr}"`);
    return null;
  }

  // Use current year
  const now = new Date();
  const date = new Date(now.getFullYear(), month, day, hours, mins, 0);

  // If date is in future, use previous year
  if (date > now) {
    date.setFullYear(now.getFullYear() - 1);
  }

  return date;
}

/**
 * Parse time range: "18:40 - 20:00"
 */
function parseTimeRange(timeStr: string): {
  startTime: string;
  endTime: string;
  durationMinutes: number;
} | null {
  if (!timeStr) return null;

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const startHours = parseInt(match[1]);
  const startMins = parseInt(match[2]);
  const endHours = parseInt(match[3]);
  const endMins = parseInt(match[4]);

  const startTime = `${String(startHours).padStart(2, "0")}:${String(startMins).padStart(2, "0")}`;
  const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;

  let durationMinutes = endHours * 60 + endMins - (startHours * 60 + startMins);

  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }

  return { startTime, endTime, durationMinutes };
}

/**
 * Map ZAPISIKZ status to Assignment status
 */
function mapStatus(
  zapisiStatus: string
): "new" | "scheduled" | "completed" | "canceled" {
  const statusMap: {
    [key: string]: "new" | "scheduled" | "completed" | "canceled";
  } = {
    обслужен: "completed",
    "в ожидании": "scheduled",
    отменено: "canceled",
    новая: "new",
    записан: "scheduled",
  };

  return statusMap[zapisiStatus.toLowerCase()] || "new";
}

/**
 * Extract source from ZAPISIKZ format
 */
function extractSource(sourceStr?: string): string {
  if (!sourceStr) return "zapisikz_import";

  const lower = sourceStr.toLowerCase();

  if (lower.includes("web")) return "website";
  if (lower.includes("instagram")) return "instagram";
  if (lower.includes("whatsapp")) return "whatsapp";
  if (lower.includes("telegram")) return "telegram";
  if (lower.includes("2gis")) return "2gis";

  return "zapisikz_import";
}

// ═══════════════════════════════════════════════════════════════════════════
// 📥 ZAPISIKZ Importer
// ═══════════════════════════════════════════════════════════════════════════

export class ZAPISIKZImporter {
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

    // Step 1: Parse Excel/CSV
    await updateProgress(10, "Parsing ZAPISIKZ file...");
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: ZAPISIKZRow[] = XLSX.utils.sheet_to_json(sheet, { raw: false });
    stats.totalRecords = rows.length;

    console.log(`📊 Found ${rows.length} records in ZAPISIKZ file`);

    // Step 2: Extract unique masters and clients
    await updateProgress(20, "Extracting masters and clients...");
    const uniqueMasters = new Map<string, { name: string }>();
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

    // Step 3: Create/Find Masters
    await updateProgress(30, "Creating masters...");
    const masterMap = new Map<string, number>();

    for (const [masterName, masterData] of uniqueMasters) {
      try {
        let staff = await OrganizationStaff.findOne({
          where: {
            first_name: masterName.split(" ")[0],
            last_name: masterName.split(" ").slice(1).join(" ") || "",
            branches: sequelize.literal(`branches @> '[{"id": ${branchId}}]'`),
          },
        });

        if (!staff) {
          const [firstName, ...lastNameParts] = masterName.split(" ");
          staff = await OrganizationStaff.create({
            organization: { id: organizationId, name: "" },
            branches: [{ id: branchId, name: "", address: "" }],
            first_name: firstName,
            last_name: lastNameParts.join(" ") || firstName,
            email: `${firstName.toLowerCase()}.zapisikz.${branchId}@imported.local`,
            password: "temporary_password",
            role: "employee",
            customRole: null,
            is_active: true,
          });
          stats.staffCreated++;
          console.log(`✅ Created master: ${masterName} (ID: ${staff.id})`);
        }

        masterMap.set(masterName, staff.id);
      } catch (error) {
        console.error(`❌ Error creating master ${masterName}:`, error);
        stats.errors.push(`Failed to create master: ${masterName}`);
      }
    }

    // Step 4: Create/Find Clients
    await updateProgress(50, "Creating clients...");
    const clientMap = new Map<string, string>();

    for (const [phone, clientData] of uniqueClients) {
      try {
        let client = await Client.findOne({
          where: { phone_number: phone },
        });

        if (!client) {
          const clientId = generateClientId("zapisikz", phone);
          const [firstName, ...lastNameParts] = clientData.name.split(" ");

          client = await Client.create({
            id: clientId,
            first_name: firstName || "Unknown",
            last_name: lastNameParts.join(" ") || null,
            phone_number: phone,
            password: "temporary_password",
            is_active: true,
            token: null,
          });
          stats.clientsCreated++;
          console.log(`✅ Created client: ${clientData.name} (ID: ${clientId})`);
        }

        clientMap.set(phone, client.id);
      } catch (error) {
        console.error(`❌ Error creating client ${clientData.name}:`, error);
        stats.errors.push(`Failed to create client: ${clientData.name}`);
      }
    }

    // Step 5: Import Assignments
    await updateProgress(70, "Importing assignments...");

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const masterName = row["Мастер"]?.trim();
        const clientPhone = normalizePhone(row["Телефон"] || "");
        const clientName = row["Клиент"]?.trim();
        const timeStr = row["Время"];
        const status = row["Статус"];
        const source = extractSource(row["Источник"]);

        const employeeId = masterMap.get(masterName);
        const clientId = clientMap.get(clientPhone);

        if (!employeeId || !clientId) {
          stats.errors.push(`Missing IDs for row ${i + 1}`);
          continue;
        }

        // Parse date and time
        const assignmentDate = parseRussianDate(timeStr);
        const timeRange = parseTimeRange(timeStr);

        if (!assignmentDate || !timeRange) {
          stats.errors.push(`Invalid date/time for row ${i + 1}: ${timeStr}`);
          continue;
        }

        // Check duplicates
        if (options?.skipDuplicates) {
          const existing = await Assignment.findOne({
            where: {
              branch_id: branchId,
              assignment_date: assignmentDate,
              start_time: timeRange.startTime,
              employee_id: employeeId,
            },
          });

          if (existing) {
            console.log(`⏭️ Skipping duplicate: ${timeStr} - ${masterName}`);
            continue;
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
          service_id: 0,
          service_snapshot: {
            id: 0,
            name: "Услуга",
            price: 0,
            duration: timeRange.durationMinutes,
          },
          assignment_date: assignmentDate,
          start_time: timeRange.startTime,
          end_time: timeRange.endTime,
          status: mapStatus(status),
          source: source,
          final_price: 0,
          total_duration: timeRange.durationMinutes,
          paid: "unpaid",
          timezone: "Asia/Bishkek",
        });

        stats.assignmentsCreated++;
        stats.processedRecords++;

        // Update progress
        if (i % 10 === 0) {
          const progress = 70 + Math.floor((i / rows.length) * 25);
          await updateProgress(progress, `Processing: ${i}/${rows.length}`);
        }
      } catch (error) {
        console.error(`❌ Error importing row ${i + 1}:`, error);
        stats.errors.push(
          `Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown"}`
        );
      }
    }

    await updateProgress(95, "Finalizing...");

    console.log("\n📊 ZAPISIKZ Import Summary:");
    console.log(`   Total Records: ${stats.totalRecords}`);
    console.log(`   Clients Created: ${stats.clientsCreated}`);
    console.log(`   Staff Created: ${stats.staffCreated}`);
    console.log(`   Assignments Created: ${stats.assignmentsCreated}`);
    console.log(`   Errors: ${stats.errors.length}`);

    await updateProgress(100, "Completed");

    return stats;
  }
}
