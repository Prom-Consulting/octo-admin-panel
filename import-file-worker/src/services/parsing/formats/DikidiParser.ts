import ExcelJS from 'exceljs';
import type { ParsedResult } from "../../../types.ts";
import { ExcelParser } from "../base/ExcelParser.ts";

export interface DikidiRecord {
  date: string;
  startTime: string;
  endTime: string;
  masterName: string;
  clientName: string;
  clientPhone: string;
  serviceType: string;
  price: number;
  branch: string;
}

interface ParsedCellData {
  startTime: string;
  endTime: string;
  masterName?: string;
  clientName: string;
  clientPhone: string;
  serviceType: string;
  price: number;
}

interface SheetParseResult {
  sheetName: string;
  sheetIndex: number;
  records: DikidiRecord[];
  parseErrors: string[];
  date: string;
  masterNames: string[];
  totalRecords: number;
  skippedRecords: number;
}

export class DikidiParser extends ExcelParser<DikidiRecord> {
  private sheetResults: SheetParseResult[] = [];
  private currentSheetDate: string = '';
  private currentMasterNames: Map<number, string> = new Map();

  constructor() {
    super({
      skipEmptyRows: true,
      validateRecords: true,
      batchSize: 1000,
    });
  }

  /**
   * Парсит все листы в файле
   */
  async parseAllSheets(filePath: string): Promise<{
    fileName: string;
    totalSheets: number;
    totalRecords: number;
    sheetResults: SheetParseResult[];
    allRecords: DikidiRecord[];
    allParseErrors: string[];
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    this.sheetResults = [];
    const allRecords: DikidiRecord[] = [];
    const allParseErrors: string[] = [];

    console.log(`📚 Found ${workbook.worksheets.length} sheets in file`);

    // Парсим каждый лист
    for (let sheetIndex = 0; sheetIndex < workbook.worksheets.length; sheetIndex++) {
      const sheet = workbook.worksheets[sheetIndex];
      console.log(`\n📑 Processing sheet ${sheetIndex + 1}/${workbook.worksheets.length}: ${sheet.name}`);

      try {
        const result = await this.parseSingleSheet(filePath, sheet.name);
        this.sheetResults.push(result);

        allRecords.push(...result.records);
        allParseErrors.push(...result.parseErrors);

        console.log(`✅ Sheet "${sheet.name}": ${result.records.length} records, ${result.parseErrors.length} errors`);
      } catch (error) {
        const errorMsg = `Error processing sheet "${sheet.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMsg}`);
        allParseErrors.push(errorMsg);

        this.sheetResults.push({
          sheetName: sheet.name,
          sheetIndex: sheetIndex + 1,
          records: [],
          parseErrors: [errorMsg],
          date: '',
          masterNames: [],
          totalRecords: 0,
          skippedRecords: 0
        });
      }
    }

    return {
      fileName: filePath.split('/').pop() || '',
      totalSheets: workbook.worksheets.length,
      totalRecords: allRecords.length,
      sheetResults: this.sheetResults,
      allRecords,
      allParseErrors
    };
  }

  async parseSingleSheet(filePath: string, sheetName: string): Promise<SheetParseResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }
    а
    this.currentMasterNames = new Map();
    this.currentSheetDate = this.extractDateFromSheetName(sheet.name);

    this.extractMasterNames(sheet);

    const records: DikidiRecord[] = [];
    const parseErrors: string[] = [];
    let totalRecords = 0;
    let skippedRecords = 0;

    // Начинаем со строки 2 (первая строка - заголовки)
    for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
      const row = sheet.getRow(rowIndex);

      // Получаем время из колонки A
      const timeValue = this.getCellValue(row, 1, '');

      // Если в A-колонке только время (без данных записи), пропускаем
      if (!timeValue || this.isJustTime(timeValue)) {
        continue;
      }

      // Проверяем все колонки мастеров (B, C, D, ...)
      for (const [colIndex, masterName] of this.currentMasterNames.entries()) {
        const cellValue = this.getCellValue(row, colIndex, '');

        if (!cellValue) {
          continue;
        }

        totalRecords++;

        try {
          const parsedData = this.parseCellData(cellValue);

          if (parsedData) {
            const record: DikidiRecord = {
              date: this.currentSheetDate,
              startTime: parsedData.startTime,
              endTime: parsedData.endTime,
              masterName,
              clientName: parsedData.clientName,
              clientPhone: parsedData.clientPhone,
              serviceType: parsedData.serviceType,
              price: parsedData.price,
              branch: 'default',
            };

            const errors = this.validateRecord(record, rowIndex);
            if (errors.length > 0) {
              parseErrors.push(`Row ${rowIndex}, Col ${colIndex}: ${errors.join(', ')}`);
              skippedRecords++;
              continue;
            }

            records.push(record);
          } else {
            skippedRecords++;
          }
        } catch (error) {
          const errorMsg = `Row ${rowIndex}, Col ${colIndex}: ${error instanceof Error ? error.message : 'Parse error'}`;
          parseErrors.push(errorMsg);
          skippedRecords++;
        }
      }
    }

    return {
      sheetName: sheet.name,
      sheetIndex: this.getSheetIndex(workbook, sheet.name) + 1,
      records,
      parseErrors,
      date: this.currentSheetDate,
      masterNames: Array.from(this.currentMasterNames.values()),
      totalRecords,
      skippedRecords
    };
  }

  /**
   * Проверяет, является ли значение просто временем (например "9:00")
   */
  private isJustTime(value: string): boolean {
    const strValue = value.toString().trim();
    // Проверяем, что это только время без дополнительных данных
    return /^\d{1,2}:\d{2}$/.test(strValue);
  }

  /**
   * Извлекает дату из имени листа
   */
  private extractDateFromSheetName(sheetName: string): string {
    // Формат: dd.mm.yyyy
    const dateMatch = sheetName.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (dateMatch) {
      const [_, day, month, year] = dateMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Другие форматы
    const otherFormats = [
      /(\d{4})-(\d{2})-(\d{2})/, // yyyy-mm-dd
      /(\d{2})\/(\d{2})\/(\d{4})/, // dd/mm/yyyy
      /(\d{2})-(\d{2})-(\d{4})/, // dd-mm-yyyy
    ];

    for (const format of otherFormats) {
      const match = sheetName.match(format);
      if (match) {
        const [_, p1, p2, p3] = match;
        // Определяем формат
        if (p1.length === 4) {
          // yyyy-mm-dd
          return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
        } else {
          // dd-mm-yyyy или dd/mm/yyyy
          return `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
        }
      }
    }

    // Если дата не найдена, используем текущую
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private extractMasterNames(sheet: ExcelJS.Worksheet): void {
    const headerRow = sheet.getRow(1);
    this.currentMasterNames.clear();

    // Начинаем с колонки B (индекс 2)
    for (let col = 2; col <= sheet.columnCount; col++) {
      const masterName = this.getCellValue(headerRow, col, '');
      if (masterName && typeof masterName === 'string' && masterName.trim()) {
        this.currentMasterNames.set(col, masterName.trim());
      }
    }

    if (this.currentMasterNames.size === 0) {
      throw new Error('No master names found in first row');
    }
  }

  private parseCellData(cellContent: any): ParsedCellData | null {
    if (!cellContent) {
      return null;
    }

    const content = cellContent.toString().trim();
    if (!content) {
      return null;
    }

    // Разбиваем по переносам строк
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) {
      return null;
    }

    // Первая строка: время + цена
    const firstLine = lines[0];

    // Извлекаем временной диапазон: 11:00 - 13:00
    const timeMatch = firstLine.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (!timeMatch) {
      return null;
    }

    const [, startHour, startMin, endHour, endMin] = timeMatch;
    const startTime = `${startHour.padStart(2, '0')}:${startMin}`;
    const endTime = `${endHour.padStart(2, '0')}:${endMin}`;

    // Извлекаем цену: (700 KGS) или (700) или 700
    const priceMatch = firstLine.match(/\(?\s*(\d+)\s*(?:KGS|kgs|₽)?\s*\)?/i);
    const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

    // Вторая строка: имя клиента
    const clientName = lines[1] || '';

    // Третья строка: телефон (может отсутствовать)
    const thirdLine = lines[2] || '';

    // Четвертая строка: услуга (может отсутствовать)
    const fourthLine = lines[3] || '';

    // Определяем, что телефон, а что услуга
    let clientPhone: string;
    let serviceType: string;

    if (this.isPhoneNumber(thirdLine)) {
      clientPhone = thirdLine;
      serviceType = fourthLine || 'Услуга не указана';
    } else if (this.isPhoneNumber(fourthLine)) {
      clientPhone = fourthLine;
      serviceType = thirdLine || 'Услуга не указана';
    } else {
      // Если нет явного телефона, пытаемся найти его
      serviceType = thirdLine || 'Услуга не указана';
      clientPhone = fourthLine || '';
    }

    clientPhone = this.cleanPhoneNumber(clientPhone);

    return {
      startTime,
      endTime,
      clientName,
      clientPhone,
      serviceType,
      price,
    };
  }

  /**
   * Проверяет, является ли строка номером телефона
   */
  private isPhoneNumber(str: string): boolean {
    if (!str) return false;
    const cleaned = str.replace(/[^\d\+]/g, '');

    return (
      /^\+?\d{10,15}$/.test(cleaned) ||
      /^(996|\+996|0)?\d{9,10}$/.test(cleaned) ||
      /^(7|\+7|8)?\d{10}$/.test(cleaned)
    );
  }

  /**
   * Очищает и нормализует номер телефона
   */
  private cleanPhoneNumber(phone: string): string {
    if (!phone) return '';

    let cleaned = phone.replace(/[^\d\+]/g, '');

    // Россия: 8XXXXXXXXXX -> +7XXXXXXXXXX
    if (cleaned.startsWith('8') && cleaned.length === 11) {
      cleaned = '+7' + cleaned.substring(1);
    }

    // Кыргызстан: 0XXXXXXXXX -> +996XXXXXXXXX
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '+996' + cleaned.substring(1);
    }

    // Добавляем + если его нет
    if (cleaned.length >= 10 && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Валидация записи
   */
  protected validateRecord(record: DikidiRecord, rowIndex: number): string[] {
    const errors: string[] = [];

    if (!record.date) {
      errors.push('Missing date');
    }

    if (!record.startTime) {
      errors.push('Missing start time');
    } else {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(record.startTime)) {
        errors.push(`Invalid start time format: ${record.startTime}`);
      }
    }

    if (!record.endTime) {
      errors.push('Missing end time');
    } else {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(record.endTime)) {
        errors.push(`Invalid end time format: ${record.endTime}`);
      }
    }

    if (!record.masterName) {
      errors.push('Missing master name');
    }

    if (!record.clientName) {
      errors.push('Missing client name');
    }

    if (record.price < 0) {
      errors.push(`Invalid price: ${record.price}`);
    }

    // Проверяем, что endTime больше startTime
    if (record.startTime && record.endTime) {
      const start = this.timeToMinutes(record.startTime);
      const end = this.timeToMinutes(record.endTime);

      if (start >= end) {
        errors.push(`End time (${record.endTime}) must be after start time (${record.startTime})`);
      }
    }

    return errors;
  }

  /**
   * Конвертирует время в минуты для сравнения
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Получает информацию о всех листах в файле
   */
  async getSheetsInfo(filePath: string): Promise<Array<{
    index: number;
    name: string;
    rowCount: number;
    date: string;
    masterCount: number;
  }>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    return workbook.worksheets.map((sheet, index) => {
      const date = this.extractDateFromSheetName(sheet.name);
      const headerRow = sheet.getRow(1);

      let masterCount = 0;
      for (let col = 2; col <= sheet.columnCount; col++) {
        const masterName = this.getCellValue(headerRow, col, '');
        if (masterName && typeof masterName === 'string' && masterName.trim()) {
          masterCount++;
        }
      }

      return {
        index: index + 1,
        name: sheet.name,
        rowCount: sheet.rowCount,
        date,
        masterCount
      };
    });
  }

  /**
   * Старый метод для обратной совместимости (парсит первый лист)
   */
  async parseFile(filePath: string): Promise<ParsedResult<DikidiRecord>> {
    console.log('⚠️ Using deprecated parseFile() method. Consider using parseAllSheets() or parseSingleSheet()');

    const result = await this.parseAllSheets(filePath);

    return {
      fileName: result.fileName,
      totalRecords: result.totalRecords,
      records: result.allRecords,
      parseErrors: result.allParseErrors,
      metadata: {
        format: 'dikidi',
        sheetName: result.sheetResults[0]?.sheetName || '',
        sheetIndex: 0,
        columns: 0,
        totalSheets: result.totalSheets
      }
    };
  }

  // Вспомогательные методы для работы с результатами

  /**
   * Получает все записи с определенного листа
   */
  getRecordsBySheet(sheetName: string): DikidiRecord[] {
    const result = this.sheetResults.find(s => s.sheetName === sheetName);
    return result ? result.records : [];
  }

  /**
   * Получает все записи с листа по индексу
   */
  getRecordsBySheetIndex(sheetIndex: number): DikidiRecord[] {
    const result = this.sheetResults.find(s => s.sheetIndex === sheetIndex);
    return result ? result.records : [];
  }

  /**
   * Получает статистику по всем листам
   */
  getSheetsStats(): Array<{
    sheetName: string;
    sheetIndex: number;
    recordCount: number;
    errorCount: number;
    date: string;
    masterCount: number;
  }> {
    return this.sheetResults.map(result => ({
      sheetName: result.sheetName,
      sheetIndex: result.sheetIndex,
      recordCount: result.records.length,
      errorCount: result.parseErrors.length,
      date: result.date,
      masterCount: result.masterNames.length
    }));
  }

  /**
   * Фильтрует записи по мастеру
   */
  filterByMaster(masterName: string): DikidiRecord[] {
    const allRecords = this.sheetResults.flatMap(result => result.records);
    return allRecords.filter(record => record.masterName === masterName);
  }

  /**
   * Фильтрует записи по дате
   */
  filterByDate(date: string): DikidiRecord[] {
    const allRecords = this.sheetResults.flatMap(result => result.records);
    return allRecords.filter(record => record.date === date);
  }

  protected getCellValue(row: ExcelJS.Row, columnIndex: number, defaultValue: any = ''): any {
    try {
      if (columnIndex < 1 || columnIndex > 16384) {
        return defaultValue;
      }

      return super.getCellValue(row, columnIndex, defaultValue);
    } catch (error) {
      return defaultValue;
    }
  }
}