export interface BranchStaff {
    id: number;
    name: string;
    address: string;
}

export interface OrganizationClient {
    id: string;
    source_type: string;
    first_name: string;
    last_name?: string | null;
    custom_name?: string | null;
    username?: string | null;
    phone_number: string;
    is_active: boolean;
    instance_id?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ZapisiKzRecord {
    time: string;
    authorFirsName: string;
    authorLastName: string | null;
    masterFirsName: string;
    masterLastName: string | null;
    clientName: string;
    phoneNumber: string;
    activityType: string;
    status: string;
    color: string;
    source: string;
    changeDate: string;
    raw: any[];
}

export interface ParsedZapisiKzResult {
    fileName: string;
    totalRecords: number;
    records: ZapisiKzRecord[];
    parseErrors: string[];
}

export interface ParsedResult<T> {
  fileName: string;
  totalRecords: number;
  records: T[];
  parseErrors: string[];
  metadata: {
    format: string;
    sheetName?: string;
    columns?: number;
    [key: string]: any;
  };
}

export interface ParserConfig {
  skipEmptyRows: boolean;
  validateRecords: boolean;
  batchSize: number;
}

export interface ParseOptions {
  sheetName?: string;
  startRow?: number;
  endRow?: number;
}

export const statusMap: Record<string, string> = {
    "Обслужен": "completed",
    "Новая": "new",
    "Не пришёл": "canceled",
    "В ожидании": "scheduled"
};