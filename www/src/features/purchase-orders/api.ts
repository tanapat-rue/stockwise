import { apiClient, ApiResponse, PaginatedResponse } from '@/lib/api-client';
import type {
  PurchaseOrder,
  PurchaseOrderFilters,
  PurchaseOrderFormValues,
  ReceiveItemsPayload,
  POStatus,
} from './types';

export const purchaseOrdersApi = {
  // CRUD
  list: (filters?: PurchaseOrderFilters) =>
    apiClient.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders', filters as Record<string, string | number | boolean | undefined>),

  get: (id: string) =>
    apiClient.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`),

  create: (data: PurchaseOrderFormValues) =>
    apiClient.post<ApiResponse<PurchaseOrder>>('/purchase-orders', data),

  update: (id: string, data: Partial<PurchaseOrderFormValues>) =>
    apiClient.patch<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/purchase-orders/${id}`),

  // Status updates
  updateStatus: (id: string, status: POStatus, notes?: string) =>
    apiClient.post<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/status`, { status, notes }),

  // Submit draft
  submit: (id: string) =>
    apiClient.post<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/submit`),

  // Receive items
  receiveItems: (id: string, payload: ReceiveItemsPayload) =>
    apiClient.post<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/receive`, payload),

  // Cancel
  cancel: (id: string, reason?: string) =>
    apiClient.post<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/cancel`, { reason }),

  // Payment
  recordPayment: (id: string, amount: number, method: string, reference?: string) =>
    apiClient.post<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/payment`, {
      amount,
      method,
      reference,
    }),

  // Duplicate
  duplicate: (id: string) =>
    apiClient.post<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/duplicate`),

  // Get next order number
  getNextNumber: () =>
    apiClient.get<ApiResponse<{ orderNumber: string }>>('/purchase-orders/next-number'),

  // Stats
  getStats: (filters?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ApiResponse<{
      total: number;
      pending: number;
      totalValue: number;
      unpaidValue: number;
    }>>('/purchase-orders/stats', filters as Record<string, string | number | boolean | undefined>),
};
