/**
 * 🔄 Altegio (YCLIENTS) Importer
 * 
 * Imports data from Altegio/YCLIENTS booking system
 * Supports standard Altegio export formats
 */

import * as XLSX from 'xlsx';
import { sequelize } from '../dbConfig/dbConfig';

import type { ImportJobData } from './import-export-service';
import { generateClientId, normalizePhone, parseDate } from './import-export-service';
import Assignment from "../modules/assignments/models/Assignment.ts";
import OrganizationStaff from "../modules/staff/models/OrganizationStaff.ts";
import Client from "../modules/client/models/Client.ts";

// ═══════════════════════════════════════════════════════════════════════════
// 📋 Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

interface AltegioRow {
  // Common fields in Altegio exports
  'Дата'?: string;                    // "06.11.2025"
  'Время начала'?: string;            // "10:00"
  'Время окончания'?: string;         // "11:30"
  'Клиент'?: string;                  // "Иванов Иван"
  'Телефон'?: string;                 // "+7 999 123-45-67"
  'Email'?: string;                   // "client@example.com"
  'Сотрудник'?: string;               // "Мария Петрова"
  'Услуга'?: string;                  // "Стрижка"
  'Стоимость'?: string | number;      // "1500" or 1500
  'Длительность'?: string | number;   // "90" or "01:30"
  'Статус'?: string;                  // "Визит состоялся", "Не пришел", "Отменен"
  'Комментарий'?: string;             // Notes
  'Источник'?: string;                // "Сайт", "Телефон", "Instagram"
  'Способ оплаты'?: string;           // "Наличные", "Карта"
  'Оплачено'?: string | number;       // "Да", "Нет", 1, 0
  
  // Alternative column names (English)
  'Date'?: string;
  'Start time'?: string;
  'End time'?: string;
  'Client'?: string;
  'Phone'?: string;
  'Staff'?: string;
  'Service'?: string;
  'Price'?: string | number;
  'Duration'?: string | number;
  'Status'?: string;
  'Comment'?: string;
  'Source'?: string;
  'Payment method'?: string;
  'Paid'?: string | number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get value from row with multiple possible column names
 */
function getRowValue(row: AltegioRow, ...possibleNames: string[]): string | undefined {
  for (const name of possibleNames) {
    if (row[name as keyof AltegioRow]) {
      return String(row[name as keyof AltegioRow]);
    }
  }
  return undefined;
}

/**
 * Parse duration: "90" (minutes) or "01:30" (HH:MM)
 */
function parseDuration(durationStr: string | number): number {
  if (typeof durationStr === 'number') {
    return durationStr;
  }

  if (!durationStr) return 60; // Default 60 minutes

  // If format is "HH:MM" or "H:MM"
  const timeMatch = durationStr.match(/(\d+):(\d+)/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const mins = parseInt(timeMatch[2]);
    return hours * 60 + mins;
  }

  // Otherwise parse as minutes
  const minutes = parseInt(String(durationStr).replace(/\D/g, ''));
  return isNaN(minutes) ? 60 : minutes;
}

/**
 * Calculate end time from start time and duration
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

/**
 * Map Altegio status to Assignment status
 */
function mapAltegioStatus(altegioStatus: string): 'new' | 'scheduled' | 'completed' | 'canceled' {
  const lower = altegioStatus.toLowerCase();
  
  if (lower.includes('состоялся') || lower.includes('completed')) {
    return 'completed';
  }
  if (lower.includes('не пришел') || lower.includes('no show') || lower.includes('no-show')) {
    return 'canceled';
  }
  if (lower.includes('отменен') || lower.includes('canceled') || lower.includes('cancelled')) {
    return 'canceled';
  }
  if (lower.includes('подтвержден') || lower.includes('confirmed')) {
    return 'scheduled';
  }
  
  return 'new';
}

/**
 * Extract source from Altegio format
 */
function extractAltegioSource(sourceStr?: string): string {
  if (!sourceStr) return 'altegio_import';

  const lower = sourceStr.toLowerCase();
  
  if (lower.includes('сайт') || lower.includes('website')) return 'website';
  if (lower.includes('instagram')) return 'instagram';
  if (lower.includes('whatsapp')) return 'whatsapp';
  if (lower.includes('telegram')) return 'telegram';
  if (lower.includes('телефон') || lower.includes('phone')) return 'phone';
  if (lower.includes('2gis')) return '2gis';
  if (lower.includes('google')) return 'google';
  
  return 'altegio_import';
}

/**
 * Parse payment method
 */
function parsePaymentMethod(paymentStr?: string): { name: string; type: string } | null {
  if (!paymentStr) return null;

  const lower = paymentStr.toLowerCase();
  
  if (lower.includes('наличн') || lower.includes('cash')) {
    return { name: 'Наличные', type: 'cash' };
  }
  if (lower.includes('карт') || lower.includes('card')) {
    return { name: 'Карта', type: 'card' };
  }
  if (lower.includes('перевод') || lower.includes('transfer')) {
    return { name: 'Перевод', type: 'transfer' };
  }
  if (lower.includes('сертификат') || lower.includes('certificate')) {
    return { name: 'Сертификат', type: 'gift_certificate' };
  }
  
  return { name: paymentStr, type: 'other' };
}

/**
 * Check if paid
 */
function isPaid(paidStr?: string | number): 'paid' | 'unpaid' {
  if (!paidStr) return 'unpaid';

  if (typeof paidStr === 'number') {
    return paidStr > 0 ? 'paid' : 'unpaid';
  }

  const lower = String(paidStr).toLowerCase();
  
  if (lower === 'да' || lower === 'yes' || lower === '1' || lower === 'true') {
    return 'paid';
  }
  
  return 'unpaid';
}

// ═══════════════════════════════════════════════════════════════════════════
// 📥 Altegio Importer
// ═══════════════════════════════════════════════════════════════════════════

export class AltegioImporter {
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
    await updateProgress(10, 'Parsing Altegio file...');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: AltegioRow[] = XLSX.utils.sheet_to_json(sheet, { raw: false });
    stats.totalRecords = rows.length;

    console.log(`📊 Found ${rows.length} records in Altegio file`);

    // Step 2: Extract unique staff and clients
    await updateProgress(20, 'Extracting staff and clients...');
    const uniqueStaff = new Map<string, { name: string }>();
    const uniqueClients = new Map<string, { name: string; phone: string; email?: string }>();

    for (const row of rows) {
      const staffName = getRowValue(row, 'Сотрудник', 'Staff')?.trim();
      const clientName = getRowValue(row, 'Клиент', 'Client')?.trim();
      const clientPhone = normalizePhone(getRowValue(row, 'Телефон', 'Phone') || '');
      const clientEmail = getRowValue(row, 'Email');

      if (staffName && !uniqueStaff.has(staffName)) {
        uniqueStaff.set(staffName, { name: staffName });
      }

      if (clientPhone && !uniqueClients.has(clientPhone)) {
        uniqueClients.set(clientPhone, { 
          name: clientName || 'Unknown',
          phone: clientPhone,
          email: clientEmail 
        });
      }
    }

    console.log(`👥 Found ${uniqueStaff.size} unique staff, ${uniqueClients.size} unique clients`);

    // Step 3: Create/Find Staff
    await updateProgress(30, 'Creating staff...');
    const staffMap = new Map<string, number>();

    for (const [staffName, staffData] of uniqueStaff) {
      try {
        let staff = await OrganizationStaff.findOne({
          where: {
            first_name: staffName.split(' ')[0],
            last_name: staffName.split(' ').slice(1).join(' ') || '',
            branches: sequelize.literal(`branches @> '[{"id": ${branchId}}]'`),
          },
        });

        if (!staff) {
          const [firstName, ...lastNameParts] = staffName.split(' ');
          staff = await OrganizationStaff.create({
            organization: { id: organizationId, name: '' },
            branches: [{ id: branchId, name: '', address: '' }],
            first_name: firstName,
            last_name: lastNameParts.join(' ') || firstName,
            email: `${firstName.toLowerCase()}.altegio.${branchId}@imported.local`,
            password: 'temporary_password',
            role: 'employee',
            customRole: null,
            is_active: true,
          });
          stats.staffCreated++;
          console.log(`✅ Created staff: ${staffName} (ID: ${staff.id})`);
        }

        staffMap.set(staffName, staff.id);
      } catch (error) {
        console.error(`❌ Error creating staff ${staffName}:`, error);
        stats.errors.push(`Failed to create staff: ${staffName}`);
      }
    }

    // Step 4: Create/Find Clients
    await updateProgress(50, 'Creating clients...');
    const clientMap = new Map<string, string>();

    for (const [phone, clientData] of uniqueClients) {
      try {
        let client = await Client.findOne({
          where: { phone_number: phone },
        });

        if (!client) {
          const clientId = generateClientId('altegio', phone);
          const [firstName, ...lastNameParts] = clientData.name.split(' ');

          client = await Client.create({
            id: clientId,
            first_name: firstName || 'Unknown',
            last_name: lastNameParts.join(' ') || null,
            phone_number: phone,
            password: 'temporary_password',
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
    await updateProgress(70, 'Importing assignments...');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const staffName = getRowValue(row, 'Сотрудник', 'Staff')?.trim();
        const clientPhone = normalizePhone(getRowValue(row, 'Телефон', 'Phone') || '');
        const clientName = getRowValue(row, 'Клиент', 'Client')?.trim() || 'Unknown';
        const dateStr = getRowValue(row, 'Дата', 'Date') || '';
        const startTime = getRowValue(row, 'Время начала', 'Start time') || '10:00';
        const endTimeStr = getRowValue(row, 'Время окончания', 'End time');
        const serviceName = getRowValue(row, 'Услуга', 'Service') || 'Услуга';
        const priceStr = getRowValue(row, 'Стоимость', 'Price') || '0';
        const durationStr = getRowValue(row, 'Длительность', 'Duration') || '60';
        const statusStr = getRowValue(row, 'Статус', 'Status') || 'new';
        const sourceStr = getRowValue(row, 'Источник', 'Source');
        const paymentMethodStr = getRowValue(row, 'Способ оплаты', 'Payment method');
        const paidStr = getRowValue(row, 'Оплачено', 'Paid');
        const notes = getRowValue(row, 'Комментарий', 'Comment');

        const employeeId = staffMap.get(staffName || '');
        const clientId = clientMap.get(clientPhone);

        if (!employeeId || !clientId) {
          stats.errors.push(`Missing IDs for row ${i + 1}`);
          continue;
        }

        // Parse date
        const assignmentDate = parseDate(dateStr);
        if (!assignmentDate) {
          stats.errors.push(`Invalid date for row ${i + 1}: ${dateStr}`);
          continue;
        }

        // Parse duration and calculate end time
        const duration = parseDuration(durationStr);
        const endTime = endTimeStr || calculateEndTime(startTime, duration);

        // Parse price
        const price = typeof priceStr === 'number' 
          ? priceStr 
          : parseFloat(String(priceStr).replace(/[^\d.]/g, '')) || 0;

        // Check duplicates
        if (options?.skipDuplicates) {
          const existing = await Assignment.findOne({
            where: {
              branch_id: branchId,
              assignment_date: assignmentDate,
              start_time: startTime,
              employee_id: employeeId,
            },
          });

          if (existing) {
            console.log(`⏭️ Skipping duplicate: ${dateStr} ${startTime} - ${staffName}`);
            continue;
          }
        }

        // Create assignment
        const [firstName, ...lastNameParts] = clientName.split(' ');
        
        await Assignment.create({
          organization_id: organizationId,
          branch_id: branchId,
          client_id: clientId,
          client_snapshot: {
            id: clientId,
            first_name: firstName || 'Unknown',
            last_name: lastNameParts.join(' ') || null,
            phone_number: clientPhone,
          },
          employee_id: employeeId,
          employee_snapshot: {
            id: employeeId,
            first_name: staffName?.split(' ')[0] || 'Unknown',
            last_name: staffName?.split(' ').slice(1).join(' ') || '',
          },
          service_id: 0,
          service_snapshot: {
            id: 0,
            name: serviceName,
            price: price,
            duration: duration,
          },
          assignment_date: assignmentDate,
          start_time: startTime,
          end_time: endTime,
          status: mapAltegioStatus(statusStr),
          source: extractAltegioSource(sourceStr),
          notes: notes || null,
          final_price: price,
          total_duration: duration,
          payment_method: parsePaymentMethod(paymentMethodStr),
          paid: isPaid(paidStr),
          timezone: 'Asia/Bishkek',
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
        stats.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    await updateProgress(95, 'Finalizing...');

    console.log('\n📊 Altegio Import Summary:');
    console.log(`   Total Records: ${stats.totalRecords}`);
    console.log(`   Clients Created: ${stats.clientsCreated}`);
    console.log(`   Staff Created: ${stats.staffCreated}`);
    console.log(`   Assignments Created: ${stats.assignmentsCreated}`);
    console.log(`   Errors: ${stats.errors.length}`);

    await updateProgress(100, 'Completed');

    return stats;
  }
}
