import { apiClient } from '@/lib/api-client'
import type {
  DashboardData,
  SalesSummary,
  ProductSales,
  CustomerSales,
  DateSales,
  BranchInventoryValue,
  LowStockItem,
  CustomersSummary,
  ReportDateParams,
} from './types'

export const reportsApi = {
  getDashboard: async (params?: ReportDateParams) => {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    const query = searchParams.toString()
    const response = await apiClient.get<{ data: DashboardData }>(
      `/reports/dashboard${query ? `?${query}` : ''}`
    )
    return response.data
  },

  getSalesSummary: async (params?: ReportDateParams) => {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    const query = searchParams.toString()
    const response = await apiClient.get<{ data: SalesSummary }>(
      `/reports/sales/summary${query ? `?${query}` : ''}`
    )
    return response.data
  },

  getSalesByProduct: async (params?: ReportDateParams) => {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    const query = searchParams.toString()
    const response = await apiClient.get<{ data: ProductSales[] }>(
      `/reports/sales/by-product${query ? `?${query}` : ''}`
    )
    return response.data
  },

  getSalesByCustomer: async (params?: ReportDateParams) => {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    const query = searchParams.toString()
    const response = await apiClient.get<{ data: CustomerSales[] }>(
      `/reports/sales/by-customer${query ? `?${query}` : ''}`
    )
    return response.data
  },

  getSalesByDate: async (params?: ReportDateParams) => {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    const query = searchParams.toString()
    const response = await apiClient.get<{ data: DateSales[] }>(
      `/reports/sales/by-date${query ? `?${query}` : ''}`
    )
    return response.data
  },

  getInventoryValue: async () => {
    const response = await apiClient.get<{ data: BranchInventoryValue[] }>(
      '/reports/inventory/value'
    )
    return response.data
  },

  getLowStock: async () => {
    const response = await apiClient.get<{ data: LowStockItem[]; meta: { threshold: number; total: number } }>(
      '/reports/inventory/low-stock'
    )
    return response
  },

  getCustomersSummary: async () => {
    const response = await apiClient.get<{ data: CustomersSummary }>(
      '/reports/customers/summary'
    )
    return response.data
  },
}
