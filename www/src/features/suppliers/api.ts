import { apiClient } from '@/lib/api-client'
import type {
  Supplier,
  SupplierListParams,
  SupplierListResponse,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from './types'

export const suppliersApi = {
  list: (params?: SupplierListParams) =>
    apiClient.get<SupplierListResponse>('/api/suppliers', params as Record<string, unknown>),

  get: (id: string) => apiClient.get<{ data: Supplier }>(`/api/suppliers/${id}`),

  create: (data: CreateSupplierRequest) =>
    apiClient.post<{ data: Supplier }>('/api/suppliers', data),

  update: (id: string, data: UpdateSupplierRequest) =>
    apiClient.patch<{ data: Supplier }>(`/api/suppliers/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/suppliers/${id}`),
}
