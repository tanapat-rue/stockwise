import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { reportsApi } from './api';
import type { DateRange } from './types';

// Dashboard KPIs
export function useDashboardKPIs(branchId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'kpis', branchId],
    queryFn: () => reportsApi.getDashboardKPIs(branchId),
    select: (data) => data.data,
    refetchInterval: 60000, // Refresh every minute
  });
}

// Sales Reports
export function useSalesSummary(range: DateRange, branchId?: string) {
  return useQuery({
    queryKey: queryKeys.reports.salesSummary({ ...range, branchId }),
    queryFn: () => reportsApi.getSalesSummary(range, branchId),
    select: (data) => data.data,
  });
}

export function useSalesByProduct(range: DateRange, limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.reports.salesByProduct({ ...range, limit }),
    queryFn: () => reportsApi.getSalesByProduct(range, limit),
    select: (data) => data.data,
  });
}

export function useSalesByCategory(range: DateRange) {
  return useQuery({
    queryKey: queryKeys.reports.salesByCategory(range),
    queryFn: () => reportsApi.getSalesByCategory(range),
    select: (data) => data.data,
  });
}

export function useSalesByChannel(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'sales-by-channel', range],
    queryFn: () => reportsApi.getSalesByChannel(range),
    select: (data) => data.data,
  });
}

export function useSalesTrend(range: DateRange, groupBy: 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: queryKeys.reports.salesTrend({ ...range, groupBy }),
    queryFn: () => reportsApi.getSalesTrend(range, groupBy),
    select: (data) => data.data,
  });
}

// Inventory Reports
export function useInventoryValue() {
  return useQuery({
    queryKey: queryKeys.reports.inventoryValue(),
    queryFn: () => reportsApi.getInventoryValue(),
    select: (data) => data.data,
  });
}

export function useInventoryAging(branchId?: string) {
  return useQuery({
    queryKey: ['reports', 'inventory-aging', branchId],
    queryFn: () => reportsApi.getInventoryAging(branchId),
    select: (data) => data.data,
  });
}

export function useLowStockReport(branchId?: string) {
  return useQuery({
    queryKey: ['reports', 'low-stock', branchId],
    queryFn: () => reportsApi.getLowStockReport(branchId),
    select: (data) => data.data,
  });
}

export function useDeadStock(days: number = 90, branchId?: string) {
  return useQuery({
    queryKey: ['reports', 'dead-stock', days, branchId],
    queryFn: () => reportsApi.getDeadStock(days, branchId),
    select: (data) => data.data,
  });
}

// Customer Reports
export function useCustomerSummary(range: DateRange) {
  return useQuery({
    queryKey: queryKeys.reports.customerSummary(range),
    queryFn: () => reportsApi.getCustomerSummary(range),
    select: (data) => data.data,
  });
}

export function useTopCustomers(range: DateRange, limit: number = 10) {
  return useQuery({
    queryKey: ['reports', 'top-customers', range, limit],
    queryFn: () => reportsApi.getTopCustomers(range, limit),
    select: (data) => data.data,
  });
}
