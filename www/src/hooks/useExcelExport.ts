import { useCallback, useState } from 'react';
import { exportToExcel, ExcelColumn } from '@/lib/excel';
import { toast } from '@/components/ui/toast';

interface UseExcelExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExcelColumn[];
}

export function useExcelExport<T extends Record<string, unknown>>(
  options: UseExcelExportOptions
) {
  const [isExporting, setIsExporting] = useState(false);

  const exportData = useCallback(
    async (data: T[]) => {
      if (data.length === 0) {
        toast.error('No data to export');
        return;
      }

      setIsExporting(true);

      try {
        await exportToExcel({
          ...options,
          data,
        });
        toast.success(`Exported ${data.length} records`);
      } catch (error) {
        toast.error('Failed to export data');
        console.error('Export error:', error);
      } finally {
        setIsExporting(false);
      }
    },
    [options]
  );

  return {
    exportData,
    isExporting,
  };
}
