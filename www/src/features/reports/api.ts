import { apiClient, ApiResponse } from '@/lib/api-client';
import type {
  DateRange,
  SalesSummary,
  SalesByProduct,
  SalesByCategory,
  SalesByChannel,
  SalesTrend,
  InventoryValue,
  InventoryAging,
  LowStockItem,
  CustomerSummary,
  TopCustomer,
  DashboardKPIs,
} from './types';

export const reportsApi = {
  // Dashboard
  getDashboardKPIs: (branchId?: string) =>
    apiClient.get<ApiResponse<DashboardKPIs>>('/reports/dashboard', { params: { branchId } }),

  // Sales Reports
  getSalesSummary: (range: DateRange, branchId?: string) =>
    apiClient.get<ApiResponse<SalesSummary>>('/reports/sales/summary', {
      params: { ...range, branchId },
    }),

  getSalesByProduct: (range: DateRange, limit?: number) =>
    apiClient.get<ApiResponse<SalesByProduct[]>>('/reports/sales/by-product', {
      params: { ...range, limit },
    }),

  getSalesByCategory: (range: DateRange) =>
    apiClient.get<ApiResponse<SalesByCategory[]>>('/reports/sales/by-category', {
      params: range,
    }),

  getSalesByChannel: (range: DateRange) =>
    apiClient.get<ApiResponse<SalesByChannel[]>>('/reports/sales/by-channel', {
      params: range,
    }),

  getSalesTrend: (range: DateRange, groupBy: 'day' | 'week' | 'month' = 'day') =>
    apiClient.get<ApiResponse<SalesTrend[]>>('/reports/sales/trend', {
      params: { ...range, groupBy },
    }),

  // Inventory Reports
  getInventoryValue: () =>
    apiClient.get<ApiResponse<InventoryValue[]>>('/reports/inventory/value'),

  getInventoryAging: (branchId?: string) =>
    apiClient.get<ApiResponse<InventoryAging[]>>('/reports/inventory/aging', {
      params: { branchId },
    }),

  getLowStockReport: (branchId?: string) =>
    apiClient.get<ApiResponse<LowStockItem[]>>('/reports/inventory/low-stock', {
      params: { branchId },
    }),

  getDeadStock: (days?: number, branchId?: string) =>
    apiClient.get<ApiResponse<SalesByProduct[]>>('/reports/inventory/dead-stock', {
      params: { days, branchId },
    }),

  // Customer Reports
  getCustomerSummary: (range: DateRange) =>
    apiClient.get<ApiResponse<CustomerSummary>>('/reports/customers/summary', {
      params: range,
    }),

  getTopCustomers: (range: DateRange, limit?: number) =>
    apiClient.get<ApiResponse<TopCustomer[]>>('/reports/customers/top', {
      params: { ...range, limit },
    }),

  // Export
  exportToExcel: (reportType: string, params: Record<string, unknown>) =>
    apiClient.get<Blob>(`/reports/export/${reportType}`, {
      params,
      responseType: 'blob',
    }),
};
