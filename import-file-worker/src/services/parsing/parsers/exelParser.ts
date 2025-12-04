import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import {type ParsedZapisiKzResult, statusMap, type ZapisiKzRecord} from "../../../types";
import {splitName} from "../../../utils/splitName";

const mapStatus = (status: string): string => statusMap[status] ?? "new";

export const parseZapisiKzFile = async (filePath: string): Promise<ParsedZapisiKzResult> => {
    console.log(`\n📖 Parsing file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const fileName = path.basename(filePath);
    const records: ZapisiKzRecord[] = [];
    const parseErrors: string[] = [];

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const sheet = workbook.worksheets[0];

        if (!sheet) {
            throw new Error(`No sheets found in file: ${filePath}`);
        }

        console.log(`  📊 Sheet: ${sheet.name}, Rows: ${sheet.rowCount}`);

        const headerRowIndex = 2;
        const startIndex = headerRowIndex + 1;

        for (let i = startIndex; i <= sheet.rowCount; i++) {
            const row = sheet.getRow(i);

            if (!row || (row.values.every && row.values.every((cell: string) => !cell))) continue;

            try {
                const authorSplit = splitName((row.getCell(2).value ?? '').toString());
                const masterSplit = splitName((row.getCell(3).value ?? '').toString());

                const record: ZapisiKzRecord = {
                    time: (row.getCell(1).value ?? '').toString().trim(),
                    authorFirsName: authorSplit.firstName,
                    authorLastName: authorSplit.lastName,
                    masterFirsName: masterSplit.firstName,
                    masterLastName: masterSplit.lastName,
                    clientName: (row.getCell(4).value ?? '').toString().trim(),
                    phoneNumber: (row.getCell(5).value ?? '').toString().trim(),
                    activityType: (row.getCell(6).value ?? 'Первичный').toString().trim(),
                    status: mapStatus((row.getCell(7).value ?? '').toString().trim()),
                    color: (row.getCell(8).value ?? 'По умолчанию').toString().trim(),
                    source: (row.getCell(9).value ?? 'ZAPISIKZ').toString().trim(),
                    changeDate: (row.getCell(10).value ?? '').toString().trim(),
                    raw: row.values.slice(1)
                };


                if (!record.masterFirsName)
                    parseErrors.push(`Row ${i}: Missing master name`);
                if (!record.time)
                    parseErrors.push(`Row ${i}: Missing time`);

                records.push(record);

            } catch (error) {
                parseErrors.push(
                    `Row ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        }

        console.log(`  ✅ Parsed ${records.length} records, ${parseErrors.length} errors`);

        return {
            fileName,
            totalRecords: records.length,
            records,
            parseErrors
        };

    } catch (error) {
        throw new Error(
            `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
};