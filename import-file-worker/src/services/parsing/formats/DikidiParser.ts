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

  /**
   * Парсит конкретный лист по имени
   */
  async parseSingleSheet(filePath: string, sheetName: string): Promise<SheetParseResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    // Сбрасываем состояние для нового листа
    this.currentMasterNames = new Map();
    this.currentSheetDate = this.extractDateFromSheetName(sheet.name);

    // Извлекаем имена мастеров
    this.extractMasterNames(sheet);

    console.log(`📅 Sheet date: ${this.currentSheetDate}`);
    console.log(`👥 Masters found: ${Array.from(this.currentMasterNames.values()).join(', ')}`);

    // Парсим лист
    const parseResult = await this.parseExcelFile(
      filePath,
      'dikidi',
      this.parseRow.bind(this),
      sheetName
    );

    return {
      sheetName: sheet.name,
      sheetIndex: this.getSheetIndex(workbook, sheet.name) + 1,
      records: parseResult.records,
      parseErrors: parseResult.parseErrors,
      date: this.currentSheetDate,
      masterNames: Array.from(this.currentMasterNames.values()),
      totalRecords: parseResult.totalRecords,
      skippedRecords: parseResult.totalRecords - parseResult.records.length
    };
  }

  /**
   * Парсит конкретный лист по индексу
   */
  async parseSheetByIndex(filePath: string, sheetIndex: number): Promise<SheetParseResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.worksheets[sheetIndex];
    if (!sheet) {
      throw new Error(`Sheet at index ${sheetIndex} not found`);
    }

    return this.parseSingleSheet(filePath, sheet.name);
  }

  /**
   * Старый метод для обратной совместимости (парсит первый лист)
   */
  async parseFile(filePath: string): Promise<ParsedResult<DikidiRecord>> {
    console.log('⚠️ Using deprecated parseFile() method. Consider using parseAllSheets() or parseSingleSheet()');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error('No worksheets found in file');
    }

    this.currentSheetDate = this.extractDateFromSheetName(sheet.name);
    this.currentMasterNames = new Map();
    this.extractMasterNames(sheet);

    console.log(`📅 Sheet date: ${this.currentSheetDate}`);
    console.log(`👥 Masters found: ${Array.from(this.currentMasterNames.values()).join(', ')}`);

    return this.parseExcelFile(
      filePath,
      'dikidi',
      this.parseRow.bind(this),
      sheet.name
    );
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

      // Быстрая проверка имен мастеров (только первая строка)
      const masterCount = this.quickExtractMasterNames(sheet);

      return {
        index: index + 1,
        name: sheet.name,
        rowCount: sheet.rowCount,
        date,
        masterCount
      };
    });
  }

  protected getStartRowIndex(sheet: ExcelJS.Worksheet): number {
    return 2;
  }

  private extractDateFromSheetName(sheetName: string): string {
    const dateMatch = sheetName.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (dateMatch) {
      const [_, day, month, year] = dateMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const otherFormats = [
      /(\d{4})-(\d{2})-(\d{2})/,
      /(\d{2})\/(\d{2})\/(\d{4})/,
      /(\d{2})-(\d{2})-(\d{4})/,
    ];

    for (const format of otherFormats) {
      const match = sheetName.match(format);
      if (match) {
        const [_, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private extractMasterNames(sheet: ExcelJS.Worksheet): void {
    const headerRow = sheet.getRow(1);
    this.currentMasterNames.clear();

    for (let col = 2; col <= 5; col++) {
      const masterName = this.getCellValue(headerRow, col, '');
      if (masterName && typeof masterName === 'string' && masterName.trim()) {
        this.currentMasterNames.set(col, masterName.trim());
      }
    }

    if (this.currentMasterNames.size === 0) {
      for (let col = 2; col <= 5; col++) {
        this.currentMasterNames.set(col, `Мастер ${col - 1}`);
      }
    }
  }

  private quickExtractMasterNames(sheet: ExcelJS.Worksheet): number {
    const headerRow = sheet.getRow(1);
    let count = 0;

    for (let col = 2; col <= 5; col++) {
      const masterName = this.getCellValue(headerRow, col, '');
      if (masterName && typeof masterName === 'string' && masterName.trim()) {
        count++;
      }
    }

    return count;
  }

  private parseRow(row: ExcelJS.Row, rowIndex: number): DikidiRecord | null {
    try {
      const timeRange = this.getCellValue(row, 1, '');
      if (!timeRange) {
        return null;
      }

      const { startTime, endTime } = this.parseTimeRange(timeRange);

      // Проверяем все колонки мастеров
      for (let col = 2; col <= 5; col++) {
        const cellValue = this.getCellValue(row, col, '');
        if (!cellValue) {
          continue;
        }

        const parsedData = this.parseMergedCell(cellValue, col);
        if (parsedData) {
          const record = this.createRecord(
            rowIndex,
            startTime,
            endTime,
            col,
            parsedData
          );

          if (record) {
            return record;
          }
        }
      }

      return null;
    } catch (error) {
      console.warn(`Error parsing row ${rowIndex}:`, error);
      return null;
    }
  }

  private parseTimeRange(timeRange: any): { startTime: string; endTime: string } {
    const strValue = timeRange.toString().trim();

    const timeMatch = strValue.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);

    if (timeMatch) {
      const [, startHour, startMin, endHour, endMin] = timeMatch;
      return {
        startTime: `${startHour.padStart(2, '0')}:${startMin}`,
        endTime: `${endHour.padStart(2, '0')}:${endMin}`,
      };
    }

    const singleTimeMatch = strValue.match(/(\d{1,2}):(\d{2})/);
    if (singleTimeMatch) {
      const [, hour, min] = singleTimeMatch;
      const time = `${hour.padStart(2, '0')}:${min}`;
      const [hours, minutes] = time.split(':').map(Number);
      const endHours = hours + 1;
      return {
        startTime: time,
        endTime: `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      };
    }

    return {
      startTime: '03:00',
      endTime: '10:00',
    };
  }

  private parseMergedCell(cellContent: any, column: number): ParsedCellData | null {
    if (!cellContent) {
      return null;
    }

    const content = cellContent.toString().trim();
    if (!content) {
      return null;
    }

    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) {
      return null;
    }

    const firstLine = lines[0];

    const priceMatch = firstLine.match(/(\d+)\s*KGS/i) ||
      firstLine.match(/\((\d+)\)/) ||
      firstLine.match(/(\d+)\s*₽/i) ||
      firstLine.match(/(\d+)/);

    const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

    const clientName = lines[1] || '';
    const thirdLine = lines[2] || '';
    const fourthLine = lines[3] || '';

    let clientPhone: string;
    let serviceType: string;

    if (this.isPhoneNumber(thirdLine)) {
      clientPhone = thirdLine;
      serviceType = fourthLine || thirdLine;
    } else if (this.isPhoneNumber(fourthLine)) {
      clientPhone = fourthLine;
      serviceType = thirdLine;
    } else {
      serviceType = thirdLine || '';
      clientPhone = fourthLine || '';

      if (serviceType && this.containsDigits(serviceType) && !serviceType.includes('(')) {
        clientPhone = serviceType;
        serviceType = fourthLine || '';
      }
    }

    clientPhone = this.cleanPhoneNumber(clientPhone);

    return {
      startTime: '',
      endTime: '',
      masterName: this.currentMasterNames.get(column),
      clientName,
      clientPhone,
      serviceType: serviceType || 'Услуга не указана',
      price,
    };
  }

  private createRecord(
    rowIndex: number,
    startTime: string,
    endTime: string,
    column: number,
    parsedData: ParsedCellData
  ): DikidiRecord | null {
    const masterName = parsedData.masterName || this.currentMasterNames.get(column) || `Мастер ${column - 1}`;

    // Проверяем обязательные поля
    if (!parsedData.clientName || !masterName) {
      return null;
    }

    const record: DikidiRecord = {
      date: this.currentSheetDate,
      startTime,
      endTime,
      masterName,
      clientName: parsedData.clientName,
      clientPhone: parsedData.clientPhone,
      serviceType: parsedData.serviceType,
      price: parsedData.price,
      branch: 'default',
    };

    const errors = this.validateRecord(record, rowIndex);
    if (errors.length > 0) {
      return null;
    }

    return record;
  }

  private isPhoneNumber(str: string): boolean {
    if (!str) return false;
    const cleaned = str.replace(/[^\d\+]/g, '');

    return (
      /^\+?\d{10,15}$/.test(cleaned) ||
      /^(996|\+996|0)?\d{9,10}$/.test(cleaned) ||
      /^(7|\+7|8)?\d{10}$/.test(cleaned)
    );
  }

  private containsDigits(str: string): boolean {
    return /\d/.test(str);
  }

  private cleanPhoneNumber(phone: string): string {
    if (!phone) return '';

    let cleaned = phone.replace(/[^\d\+]/g, '');

    if (cleaned.startsWith('8') && cleaned.length === 11) {
      cleaned = '+7' + cleaned.substring(1);
    }

    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '+996' + cleaned.substring(1);
    }

    if (cleaned.length >= 10 && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  private extractDate(dateValue: any): string {
    return this.currentSheetDate;
  }

  private parsePrice(value: any): number {
    if (typeof value === 'number') {
      return Math.round(value);
    }

    if (typeof value === 'string') {
      const match = value.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }

    return 0;
  }

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

    if (record.startTime && record.endTime) {
      const start = this.timeToMinutes(record.startTime);
      const end = this.timeToMinutes(record.endTime);

      if (start >= end) {
        errors.push(`End time (${record.endTime}) must be after start time (${record.startTime})`);
      }
    }

    return errors;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
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
}