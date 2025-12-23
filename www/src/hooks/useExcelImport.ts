import { useCallback, useState } from 'react';
import {
  parseExcelFile,
  ExcelColumn,
  ExcelValidationRule,
  ExcelImportResult,
} from '@/lib/excel';
import { toast } from '@/components/ui/toast';

interface UseExcelImportOptions {
  columns: ExcelColumn[];
  validationRules?: ExcelValidationRule[];
  onSuccess?: (data: Record<string, unknown>[]) => void;
  onError?: (errors: ExcelImportResult['errors']) => void;
}

export function useExcelImport<T extends Record<string, unknown>>(
  options: UseExcelImportOptions
) {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ExcelImportResult<T> | null>(null);

  const importFile = useCallback(
    async (file: File) => {
      if (!file) {
        toast.error('No file selected');
        return null;
      }

      // Validate file type
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      const isValidType =
        validTypes.includes(file.type) ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls');

      if (!isValidType) {
        toast.error('Please upload a CSV or Excel file');
        return null;
      }

      setIsImporting(true);
      setResult(null);

      try {
        const importResult = await parseExcelFile<T>(
          file,
          options.columns,
          options.validationRules
        );

        setResult(importResult);

        if (importResult.errors.length > 0) {
          toast.error(`Found ${importResult.errors.length} validation errors`);
          options.onError?.(importResult.errors);
        } else if (importResult.data.length > 0) {
          toast.success(`Parsed ${importResult.data.length} records`);
          options.onSuccess?.(importResult.data);
        } else {
          toast.error('No data found in file');
        }

        return importResult;
      } catch (error) {
        toast.error('Failed to parse file');
        console.error('Import error:', error);
        return null;
      } finally {
        setIsImporting(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return {
    importFile,
    isImporting,
    result,
    reset,
  };
}
