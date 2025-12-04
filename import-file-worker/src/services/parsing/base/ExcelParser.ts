import ExcelJS from 'exceljs';
import fs from 'fs';
import { BaseParser } from './BaseParser';

export abstract class ExcelParser<T> extends BaseParser<T> {
    protected detectFormat(workbook: ExcelJS.Workbook): string {
        const sheet = workbook.worksheets[0];
        if (!sheet) return 'unknown';

        const headerRow = sheet.getRow(1);
        const headers = headerRow.values as string[];

        if (headers.includes('Время') && headers.includes('Мастер')) {
            return 'zapisi_kz';
        } else if (headers.includes('Дата') && headers.includes('Специалист')) {
            return 'saluzi';
        } else if (headers.includes('appointment_date')) {
            return 'yclients';
        }

        return 'unknown';
    }

    protected async parseExcelFile(
        filePath: string,
        parseRowCallback: (row: ExcelJS.Row, rowIndex: number) => T | null
    ) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const sheet = workbook.worksheets[0];
        if (!sheet) {
            throw new Error('No worksheets found in file');
        }

        const records: T[] = [];
        const parseErrors: string[] = [];

        const format = this.detectFormat(workbook);
        console.log(`📊 Detected format: ${format}`);

        const startRow = this.getStartRowIndex(sheet);

        for (let i = startRow; i <= sheet.rowCount; i++) {
            const row = sheet.getRow(i);

            try {
                if (this.config.skipEmptyRows && this.isEmptyRow(row.values as any[])) {
                    continue;
                }

                const record = parseRowCallback(row, i);
                if (record) {
                    if (this.config.validateRecords) {
                        const errors = this.validateRecord(record, i);
                        if (errors.length > 0) {
                            parseErrors.push(`Row ${i}: ${errors.join(', ')}`);
                            continue;
                        }
                    }
                    records.push(record);
                }
            } catch (error) {
                parseErrors.push(
                    `Row ${i}: ${error instanceof Error ? error.message : 'Parse error'}`
                );
            }
        }

        return {
            fileName: filePath.split('/').pop() || '',
            totalRecords: sheet.rowCount - startRow + 1,
            records,
            parseErrors,
            metadata: {
                format,
                sheetName: sheet.name,
                columns: sheet.columnCount
            }
        };
    }

    protected getStartRowIndex(sheet: ExcelJS.Worksheet): number {
        // По умолчанию начинаем с первой строки
        // Можно переопределить в конкретных парсерах
        return 1;
    }

    protected getCellValue(row: ExcelJS.Row, columnIndex: number, defaultValue: any = ''): any {
        const cell = row.getCell(columnIndex);

        if (!cell.value) {
            return defaultValue;
        }

        if (cell.type === ExcelJS.ValueType.Date) {
            return cell.value instanceof Date ? cell.value : new Date(cell.value as string);
        }

        return cell.value.toString().trim();
    }
}