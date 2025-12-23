/**
 * Excel Import/Export Utilities
 * Uses SheetJS (xlsx) for client-side Excel processing
 */

// Note: In a real implementation, you would import from 'xlsx':
// import * as XLSX from 'xlsx';

// Type definitions for Excel operations
export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
  type?: 'string' | 'number' | 'date' | 'boolean';
}

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExcelColumn[];
  data: Record<string, unknown>[];
}

export interface ExcelImportResult<T = Record<string, unknown>> {
  data: T[];
  errors: { row: number; field: string; message: string }[];
  warnings: { row: number; field: string; message: string }[];
}

export interface ExcelValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date' | 'email';
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: string[];
  custom?: (value: unknown, row: Record<string, unknown>) => string | null;
}

/**
 * Export data to Excel file (mock implementation)
 * In real implementation, use SheetJS
 */
export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
  const { filename, sheetName = 'Sheet1', columns, data } = options;

  // Convert data to CSV format as a fallback
  const headers = columns.map((col) => col.header).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse Excel file and validate data (mock implementation)
 */
export async function parseExcelFile<T = Record<string, unknown>>(
  file: File,
  columns: ExcelColumn[],
  validationRules?: ExcelValidationRule[]
): Promise<ExcelImportResult<T>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());

        if (lines.length < 2) {
          resolve({ data: [], errors: [], warnings: [] });
          return;
        }

        // Parse header
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

        // Map headers to column keys
        const headerMap: Record<string, string> = {};
        columns.forEach((col) => {
          const headerIndex = headers.findIndex(
            (h) => h.toLowerCase() === col.header.toLowerCase()
          );
          if (headerIndex !== -1) {
            headerMap[headers[headerIndex]] = col.key;
          }
        });

        // Parse rows
        const data: T[] = [];
        const errors: ExcelImportResult['errors'] = [];
        const warnings: ExcelImportResult['warnings'] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row: Record<string, unknown> = {};

          headers.forEach((header, index) => {
            const key = headerMap[header] || header;
            row[key] = values[index]?.trim() || '';
          });

          // Validate row
          if (validationRules) {
            for (const rule of validationRules) {
              const value = row[rule.field];
              const error = validateField(value, rule, row);
              if (error) {
                errors.push({ row: i + 1, field: rule.field, message: error });
              }
            }
          }

          data.push(row as T);
        }

        resolve({ data, errors, warnings });
      } catch (err) {
        reject(new Error('Failed to parse file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

/**
 * Validate a field value against rules
 */
function validateField(
  value: unknown,
  rule: ExcelValidationRule,
  row: Record<string, unknown>
): string | null {
  const strValue = String(value || '');

  if (rule.required && !strValue) {
    return `${rule.field} is required`;
  }

  if (!strValue) return null;

  if (rule.type === 'number' && isNaN(Number(strValue))) {
    return `${rule.field} must be a number`;
  }

  if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
    return `${rule.field} must be a valid email`;
  }

  if (rule.pattern && !rule.pattern.test(strValue)) {
    return `${rule.field} has invalid format`;
  }

  if (rule.minLength && strValue.length < rule.minLength) {
    return `${rule.field} must be at least ${rule.minLength} characters`;
  }

  if (rule.maxLength && strValue.length > rule.maxLength) {
    return `${rule.field} must be at most ${rule.maxLength} characters`;
  }

  if (rule.type === 'number') {
    const num = Number(strValue);
    if (rule.min !== undefined && num < rule.min) {
      return `${rule.field} must be at least ${rule.min}`;
    }
    if (rule.max !== undefined && num > rule.max) {
      return `${rule.field} must be at most ${rule.max}`;
    }
  }

  if (rule.enum && !rule.enum.includes(strValue)) {
    return `${rule.field} must be one of: ${rule.enum.join(', ')}`;
  }

  if (rule.custom) {
    return rule.custom(value, row);
  }

  return null;
}

/**
 * Generate a template Excel file for import
 */
export function generateTemplate(columns: ExcelColumn[], filename: string): void {
  const headers = columns.map((col) => col.header).join(',');
  const exampleRow = columns
    .map((col) => {
      switch (col.type) {
        case 'number':
          return '0';
        case 'date':
          return '2024-01-01';
        case 'boolean':
          return 'true';
        default:
          return 'Example';
      }
    })
    .join(',');

  const csv = [headers, exampleRow].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Product import/export column definitions
export const productExportColumns: ExcelColumn[] = [
  { key: 'sku', header: 'SKU', type: 'string' },
  { key: 'name', header: 'Name', type: 'string' },
  { key: 'description', header: 'Description', type: 'string' },
  { key: 'categoryName', header: 'Category', type: 'string' },
  { key: 'unit', header: 'Unit', type: 'string' },
  { key: 'price', header: 'Price', type: 'number' },
  { key: 'cost', header: 'Cost', type: 'number' },
  { key: 'barcode', header: 'Barcode', type: 'string' },
  { key: 'status', header: 'Status', type: 'string' },
];

export const productImportRules: ExcelValidationRule[] = [
  { field: 'sku', required: true, minLength: 1, maxLength: 50 },
  { field: 'name', required: true, minLength: 1, maxLength: 200 },
  { field: 'price', type: 'number', min: 0 },
  { field: 'cost', type: 'number', min: 0 },
  { field: 'status', enum: ['ACTIVE', 'DRAFT', 'ARCHIVED'] },
];

// Contact import/export column definitions
export const contactExportColumns: ExcelColumn[] = [
  { key: 'code', header: 'Code', type: 'string' },
  { key: 'type', header: 'Type', type: 'string' },
  { key: 'name', header: 'Name', type: 'string' },
  { key: 'company', header: 'Company', type: 'string' },
  { key: 'email', header: 'Email', type: 'string' },
  { key: 'phone', header: 'Phone', type: 'string' },
  { key: 'taxId', header: 'Tax ID', type: 'string' },
];

export const contactImportRules: ExcelValidationRule[] = [
  { field: 'type', required: true, enum: ['CUSTOMER', 'SUPPLIER', 'BOTH'] },
  { field: 'name', required: true, minLength: 1, maxLength: 200 },
  { field: 'email', type: 'email' },
];
