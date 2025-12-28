import { apiClient } from '@/lib/api-client'
import type {
  PurchaseOrder,
  POListParams,
  POListResponse,
  CreatePORequest,
  UpdatePORequest,
  ReceivePORequest,
  RecordPOPaymentRequest,
} from './types'

export const purchaseOrdersApi = {
  list: (params?: POListParams) =>
    apiClient.get<POListResponse>('/api/purchase-orders', params as Record<string, unknown>),

  get: (id: string) =>
    apiClient.get<{ data: PurchaseOrder }>(`/api/purchase-orders/${id}`),

  create: (data: CreatePORequest) =>
    apiClient.post<{ data: PurchaseOrder }>('/api/purchase-orders', data),

  update: (id: string, data: UpdatePORequest) =>
    apiClient.patch<{ data: PurchaseOrder }>(`/api/purchase-orders/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/purchase-orders/${id}`),

  // Status actions
  submit: (id: string) =>
    apiClient.post<{ data: PurchaseOrder }>(`/api/purchase-orders/${id}/submit`),

  receive: (id: string, data?: ReceivePORequest) =>
    apiClient.post<{ data: PurchaseOrder }>(`/api/purchase-orders/${id}/receive`, data || {}),

  cancel: (id: string, reason?: string) =>
    apiClient.post<{ data: PurchaseOrder }>(`/api/purchase-orders/${id}/cancel`, { reason }),

  duplicate: (id: string) =>
    apiClient.post<{ data: PurchaseOrder }>(`/api/purchase-orders/${id}/duplicate`),

  // Payment
  recordPayment: (id: string, data: RecordPOPaymentRequest) =>
    apiClient.post<{ data: PurchaseOrder }>(`/api/purchase-orders/${id}/payment`, data),

  // Update status
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.post<{ data: PurchaseOrder }>(`/api/purchase-orders/${id}/status`, { status, notes }),

  // Bulk status update
  bulkUpdateStatus: (ids: string[], status: string) =>
    apiClient.post<{ data: { updated: number } }>('/api/purchase-orders/bulk-status', { ids, status }),

  // Next PO number
  getNextNumber: () =>
    apiClient.get<{ data: { seq: number; referenceNo: string; orderNumber: string } }>('/api/purchase-orders/next-number'),

  // Stats
  getStats: () =>
    apiClient.get<{ data: { total: number; pending: number; totalValue: number; unpaidValue: number } }>('/api/purchase-orders/stats'),
}
