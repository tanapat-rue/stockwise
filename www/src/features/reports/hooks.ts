import { useQuery } from '@tanstack/react-query'
import { reportsApi } from './api'
import type { ReportDateParams } from './types'

export const reportKeys = {
  all: ['reports'] as const,
  dashboard: (params?: ReportDateParams) => [...reportKeys.all, 'dashboard', params] as const,
  salesSummary: (params?: ReportDateParams) => [...reportKeys.all, 'sales-summary', params] as const,
  salesByProduct: (params?: ReportDateParams) => [...reportKeys.all, 'sales-by-product', params] as const,
  salesByCustomer: (params?: ReportDateParams) => [...reportKeys.all, 'sales-by-customer', params] as const,
  salesByDate: (params?: ReportDateParams) => [...reportKeys.all, 'sales-by-date', params] as const,
  inventoryValue: () => [...reportKeys.all, 'inventory-value'] as const,
  lowStock: () => [...reportKeys.all, 'low-stock'] as const,
  customersSummary: () => [...reportKeys.all, 'customers-summary'] as const,
}

export function useDashboard(params?: ReportDateParams) {
  return useQuery({
    queryKey: reportKeys.dashboard(params),
    queryFn: () => reportsApi.getDashboard(params),
  })
}

export function useSalesSummary(params?: ReportDateParams) {
  return useQuery({
    queryKey: reportKeys.salesSummary(params),
    queryFn: () => reportsApi.getSalesSummary(params),
  })
}

export function useSalesByProduct(params?: ReportDateParams) {
  return useQuery({
    queryKey: reportKeys.salesByProduct(params),
    queryFn: () => reportsApi.getSalesByProduct(params),
  })
}

export function useSalesByCustomer(params?: ReportDateParams) {
  return useQuery({
    queryKey: reportKeys.salesByCustomer(params),
    queryFn: () => reportsApi.getSalesByCustomer(params),
  })
}

export function useSalesByDate(params?: ReportDateParams) {
  return useQuery({
    queryKey: reportKeys.salesByDate(params),
    queryFn: () => reportsApi.getSalesByDate(params),
  })
}

export function useInventoryValue() {
  return useQuery({
    queryKey: reportKeys.inventoryValue(),
    queryFn: () => reportsApi.getInventoryValue(),
  })
}

export function useLowStock() {
  return useQuery({
    queryKey: reportKeys.lowStock(),
    queryFn: () => reportsApi.getLowStock(),
  })
}

export function useCustomersSummary() {
  return useQuery({
    queryKey: reportKeys.customersSummary(),
    queryFn: () => reportsApi.getCustomersSummary(),
  })
}
