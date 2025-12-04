import { ExcelParser } from '../base/ExcelParser';
import ExcelJS from "exceljs";
import type {ParsedZapisiKzResult, ZapisiKzRecord} from "../../../types";
import {splitName} from "../../../utils/splitName";

export class ZapisiKzParser extends ExcelParser<ZapisiKzRecord> {
    private mapStatus(status: string): string {
      const statusMap: Record<string, string> = {
        "Обслужен": "completed",
        "Новая": "new",
        "Не пришёл": "canceled",
        "В ожидании": "scheduled",
      };

      return statusMap[status] ?? "new";
    }

    async parseFile(filePath: string): Promise<ParsedZapisiKzResult> {
        console.log(`📖 Parsing zapisi.kz file: ${filePath}`);

        const result = await this.parseExcelFile(filePath, (row, rowIndex) => {
            return this.parseZapisiKzRow(row, rowIndex);
        });

        console.log(`  ✅ Parsed ${result.records.length} records`);
        return result;
    }

    private parseZapisiKzRow(row: ExcelJS.Row, rowIndex: number): ZapisiKzRecord | null {
        const authorSplit = splitName(this.getCellValue(row, 2));
        const masterSplit = splitName(this.getCellValue(row, 3));

        return {
            time: this.getCellValue(row, 1),
            authorFirsName: authorSplit.firstName,
            authorLastName: authorSplit.lastName,
            masterFirsName: masterSplit.firstName,
            masterLastName: masterSplit.lastName,
            clientName: this.getCellValue(row, 4),
            phoneNumber: this.getCellValue(row, 5),
            activityType: this.getCellValue(row, 6, 'Первичный'),
            status: this.mapStatus(this.getCellValue(row, 7)),
            color: this.getCellValue(row, 8, 'По умолчанию'),
            source: this.getCellValue(row, 9, 'ZAPISIKZ'),
            changeDate: this.getCellValue(row, 10),
            raw: row.values as any[]
        };
    }

    protected getStartRowIndex(sheet: ExcelJS.Worksheet): number {
        return 3; // Данные начинаются с 3 строки
    }
}