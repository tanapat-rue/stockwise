import { apiClient } from '@/lib/api-client'
import type {
  Customer,
  CustomerListParams,
  CustomerListResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from './types'

export const customersApi = {
  list: (params?: CustomerListParams) =>
    apiClient.get<CustomerListResponse>('/api/customers', params as Record<string, unknown>),

  get: (id: string) => apiClient.get<{ data: Customer }>(`/api/customers/${id}`),

  create: (data: CreateCustomerRequest) =>
    apiClient.post<{ data: Customer }>('/api/customers', data),

  update: (id: string, data: UpdateCustomerRequest) =>
    apiClient.patch<{ data: Customer }>(`/api/customers/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/customers/${id}`),
}
