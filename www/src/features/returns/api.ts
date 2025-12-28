import { apiClient } from '@/lib/api-client'
import type { Return, ReturnListParams, ReturnListResponse, CreateReturnRequest } from './types'

export const returnsApi = {
  list: (params?: ReturnListParams) =>
    apiClient.get<ReturnListResponse>('/api/returns', params as Record<string, unknown>),

  get: (id: string) => apiClient.get<{ data: Return }>(`/api/returns/${id}`),

  create: (data: CreateReturnRequest) =>
    apiClient.post<{ data: Return }>('/api/returns', data),

  delete: (id: string) => apiClient.delete(`/api/returns/${id}`),

  // Status actions
  approve: (id: string) =>
    apiClient.post<{ data: Return }>(`/api/returns/${id}/approve`),

  reject: (id: string, reason?: string) =>
    apiClient.post<{ data: Return }>(`/api/returns/${id}/reject`, { reason }),

  receive: (id: string) =>
    apiClient.post<{ data: Return }>(`/api/returns/${id}/receive`),

  ship: (id: string) =>
    apiClient.post<{ data: Return }>(`/api/returns/${id}/ship`),

  complete: (id: string) =>
    apiClient.post<{ data: Return }>(`/api/returns/${id}/complete`),

  cancel: (id: string, reason?: string) =>
    apiClient.post<{ data: Return }>(`/api/returns/${id}/cancel`, { reason }),

  refund: (id: string, amount: number) =>
    apiClient.post<{ data: Return }>(`/api/returns/${id}/refund`, { amount }),

  credit: (id: string, amount: number) =>
    apiClient.post<{ data: Return }>(`/api/returns/${id}/credit`, { amount }),
}
