import * as XLSX from 'xlsx'

// Export data to Excel file
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName = 'Sheet1'
): void {
  if (data.length === 0) {
    console.warn('No data to export')
    return
  }

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Auto-size columns
  const maxWidth = 50
  const colWidths = Object.keys(data[0]).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, maxWidth) }
  })
  worksheet['!cols'] = colWidths

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

// Export data to CSV file
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  if (data.length === 0) {
    console.warn('No data to export')
    return
  }

  const worksheet = XLSX.utils.json_to_sheet(data)
  const csv = XLSX.utils.sheet_to_csv(worksheet)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// Format currency for export (remove currency symbol, just numbers)
export function formatCurrencyForExport(value: number): number {
  return value / 100 // Convert from cents to display value
}

// Format date for export
export function formatDateForExport(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}
