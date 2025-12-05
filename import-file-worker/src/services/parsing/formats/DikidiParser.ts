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

export class DikidiParser extends ExcelParser<DikidiRecord> {
  private masterNames: Map<number, string> = new Map(); // кэш имен мастеров по колонкам
  private sheetDate: string = '';

  constructor() {
    super({
      skipEmptyRows: true,
      validateRecords: true,
      batchSize: 1000,
    });
  }

  async parseFile(filePath: string): Promise<ParsedResult<DikidiRecord>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error('No worksheets found in file');
    }

    this.sheetDate = this.extractDateFromSheetName(sheet.name);

    this.extractMasterNames(sheet);

    console.log(`📅 Sheet date: ${this.sheetDate}`);
    console.log(`👥 Masters found: ${Array.from(this.masterNames.values()).join(', ')}`);

    return this.parseExcelFile(
      filePath,
      'dikidi',
      this.parseRow.bind(this)
    );
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
    this.masterNames.clear();

    for (let col = 2; col <= 5; col++) {
      const masterName = this.getCellValue(headerRow, col, '');
      if (masterName && typeof masterName === 'string' && masterName.trim()) {
        this.masterNames.set(col, masterName.trim());
        console.log(`Found master: ${masterName.trim()} in column ${col}`);
      }
    }

    if (this.masterNames.size === 0) {
      for (let col = 2; col <= 5; col++) {
        this.masterNames.set(col, `Мастер ${col - 1}`);
      }
    }
  }

  private parseRow(row: ExcelJS.Row, rowIndex: number): DikidiRecord | null {
    try {
      const timeRange = this.getCellValue(row, 1, '');
      if (!timeRange) {
        return null;
      }

      const { startTime, endTime } = this.parseTimeRange(timeRange);

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

    console.log(`Parsing cell content (col ${column}): ${content.substring(0, 50)}...`);

    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) {
      console.log(`Too few lines in cell: ${lines.length}`);
      return null;
    }

    // Первая строка содержит цену и возможно время
    const firstLine = lines[0];

    // Извлекаем цену
    const priceMatch = firstLine.match(/(\d+)\s*KGS/i) ||
      firstLine.match(/\((\d+)\)/) ||
      firstLine.match(/(\d+)\s*₽/i) ||
      firstLine.match(/(\d+)/);

    const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

    // Вторая строка - имя клиента
    const clientName = lines[1] || '';

    // Третья строка может быть телефоном или услугой
    const thirdLine = lines[2] || '';

    // Четвертая строка может быть услугой или пустой
    const fourthLine = lines[3] || '';

    // Определяем, что является телефоном, а что услугой
    let clientPhone: string;
    let serviceType: string;

    if (this.isPhoneNumber(thirdLine)) {
      clientPhone = thirdLine;
      serviceType = fourthLine || thirdLine; // Если услуга не указана отдельно, используем третью строку
    } else if (this.isPhoneNumber(fourthLine)) {
      clientPhone = fourthLine;
      serviceType = thirdLine;
    } else {
      // Если телефон не найден, пытаемся определить
      serviceType = thirdLine || '';
      clientPhone = fourthLine || '';

      // Если в строке услуги есть цифры, возможно это телефон
      if (serviceType && this.containsDigits(serviceType) && !serviceType.includes('(')) {
        clientPhone = serviceType;
        serviceType = fourthLine || '';
      }
    }

    // Чистим номер телефона
    clientPhone = this.cleanPhoneNumber(clientPhone);

    console.log(`Parsed: client="${clientName}", phone="${clientPhone}", service="${serviceType}", price=${price}`);

    return {
      startTime: '',
      endTime: '',
      masterName: this.masterNames.get(column),
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
    const masterName = parsedData.masterName || this.masterNames.get(column) || `Мастер ${column - 1}`;

    // Проверяем обязательные поля
    if (!parsedData.clientName || !masterName) {
      console.log(`Skipping record: missing client or master in row ${rowIndex}, col ${column}`);
      return null;
    }

    const record: DikidiRecord = {
      date: this.sheetDate,
      startTime,
      endTime,
      masterName,
      clientName: parsedData.clientName,
      clientPhone: parsedData.clientPhone,
      serviceType: parsedData.serviceType,
      price: parsedData.price,
      branch: 'default',
    };

    // Валидация
    const errors = this.validateRecord(record, rowIndex);
    if (errors.length > 0) {
      console.warn(`Validation errors in row ${rowIndex}:`, errors);
      return null;
    }

    console.log(`✅ Created record: ${masterName} - ${record.clientName} (${record.clientPhone}) at ${startTime}-${endTime}`);

    return record;
  }

  private isPhoneNumber(str: string): boolean {
    if (!str) return false;

    // Удаляем все нецифровые символы кроме +
    const cleaned = str.replace(/[^\d\+]/g, '');

    // Проверяем различные форматы телефонов
    return (
      // Международный формат: +996557823030
      /^\+?\d{10,15}$/.test(cleaned) ||
      // Кыргызстан: 996557823030 или 0557823030
      /^(996|\+996|0)?\d{9,10}$/.test(cleaned) ||
      // Россия: +79161234567 или 89161234567
      /^(7|\+7|8)?\d{10}$/.test(cleaned)
    );
  }

  private containsDigits(str: string): boolean {
    return /\d/.test(str);
  }

  private cleanPhoneNumber(phone: string): string {
    if (!phone) return '';

    // Удаляем все нецифровые символы кроме +
    let cleaned = phone.replace(/[^\d\+]/g, '');

    // Если начинается с 8, заменяем на +7 (для российских номеров)
    if (cleaned.startsWith('8') && cleaned.length === 11) {
      cleaned = '+7' + cleaned.substring(1);
    }

    // Если начинается с 0 и длина 10, добавляем +996
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '+996' + cleaned.substring(1);
    }

    // Если нет кода страны, добавляем + (предполагаем местный номер)
    if (cleaned.length >= 10 && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  private extractDate(dateValue: any): string {
    // Используем дату из названия листа
    return this.sheetDate;
  }

  private parsePrice(value: any): number {
    if (typeof value === 'number') {
      return Math.round(value);
    }

    if (typeof value === 'string') {
      // Извлекаем цифры
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

    // Проверяем, что время окончания позже времени начала
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
      // ExcelJS использует 1-based индексы
      if (columnIndex < 1 || columnIndex > 16384) {
        return defaultValue;
      }

      return super.getCellValue(row, columnIndex, defaultValue);
    } catch (error) {
      return defaultValue;
    }
  }
}