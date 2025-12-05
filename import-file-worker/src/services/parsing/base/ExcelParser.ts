import ExcelJS from 'exceljs';
import fs from 'fs';
import { BaseParser } from './BaseParser';

export abstract class ExcelParser<T> extends BaseParser<T> {
  protected async parseExcelFile(
    filePath: string,
    format: string,
    parseRowCallback: (row: ExcelJS.Row, rowIndex: number) => T | null,
    sheetIdentifier?: string | number
  ) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = this.getSheet(workbook, sheetIdentifier);
    if (!sheet) {
      throw new Error(this.getSheetNotFoundMessage(sheetIdentifier));
    }

    const records: T[] = [];
    const parseErrors: string[] = [];

    console.log(`📊 Detected format: ${format}`);
    console.log(`📑 Processing sheet: ${sheet.name}`);

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
        sheetIndex: this.getSheetIndex(workbook, sheet.name),
        columns: sheet.columnCount,
        totalSheets: workbook.worksheets.length
      }
    };
  }

  protected getSheet(workbook: ExcelJS.Workbook, identifier?: string | number): ExcelJS.Worksheet | null {
    if (!workbook.worksheets || workbook.worksheets.length === 0) {
      return null;
    }

    if (identifier === undefined) {
      return workbook.worksheets![0];
    }

    if (typeof identifier === 'string') {
      const sheet = workbook.getWorksheet(identifier);
      if (sheet) {
        return sheet;
      }

      const lowerIdentifier = identifier.toLowerCase();
      return workbook.worksheets.find(sheet =>
        sheet.name.toLowerCase() === lowerIdentifier
      ) || null;
    }

    if (typeof identifier === 'number') {
      const index = identifier < 1 ? identifier : identifier - 1;

      if (index >= 0 && index < workbook.worksheets.length) {
        return workbook.worksheets[index];
      }
    }

    return null;
  }

  /**
   * Генерирует сообщение об ошибке для ненайденного листа
   */
  protected getSheetNotFoundMessage(identifier?: string | number): string {
    if (identifier === undefined) {
      return 'No worksheets found in file';
    }

    if (typeof identifier === 'string') {
      return `Worksheet "${identifier}" not found in file`;
    }

    return `Worksheet at index ${identifier} not found in file`;
  }

  /**
   * Получает индекс листа в рабочей книге
   */
  protected getSheetIndex(workbook: ExcelJS.Workbook, sheetName: string): number {
    return workbook.worksheets.findIndex(sheet => sheet.name === sheetName);
  }

  /**
   * Получает список всех доступных листов
   */
  protected getAllSheetsInfo(workbook: ExcelJS.Workbook): Array<{index: number, name: string, rowCount: number}> {
    return workbook.worksheets.map((sheet, index) => ({
      index: index + 1, // 1-based индекс для пользователя
      name: sheet.name,
      rowCount: sheet.rowCount
    }));
  }

  protected getSheetByPattern(workbook: ExcelJS.Workbook, pattern: RegExp): ExcelJS.Worksheet | null {
    return workbook.worksheets.find(sheet => pattern.test(sheet.name)) || null;
  }

  protected getStartRowIndex(sheet: ExcelJS.Worksheet): number {
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