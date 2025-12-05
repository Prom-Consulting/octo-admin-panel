export abstract class BaseParser<T> {
    protected config: ParserConfig;

    constructor(config?: Partial<ParserConfig>) {
        this.config = {
            skipEmptyRows: true,
            validateRecords: true,
            batchSize: 1000,
            ...config
        };
    }

    abstract parseFile(filePath: string): Promise<ParsedResult<T>>;

    protected validateRecord(record: T, rowIndex: number): string[] {
        const errors: string[] = [];

        if (!record || typeof record !== 'object') {
            errors.push('Invalid record format');
        }

        return errors;
    }

    protected isEmptyRow(values: any[]): boolean {
        return values.every(value =>
            value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim() === '')
        );
    }

    getStats(result: ParsedResult<T>) {
        return {
            fileName: result.fileName,
            totalRecords: result.totalRecords,
            validRecords: result.records.length,
            errorCount: result.parseErrors.length,
            errorPercentage: result.parseErrors.length / result.totalRecords * 100
        };
    }
}