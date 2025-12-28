import { apiClient } from '@/lib/api-client'
import type {
  Order,
  OrderListParams,
  OrderListResponse,
  CreateOrderRequest,
  UpdateOrderRequest,
  ShipOrderRequest,
  CancelOrderRequest,
} from './types'

export const ordersApi = {
  list: (params?: OrderListParams) =>
    apiClient.get<OrderListResponse>('/api/orders', params as Record<string, unknown>),

  get: (id: string) => apiClient.get<{ data: Order }>(`/api/orders/${id}`),

  create: (data: CreateOrderRequest) =>
    apiClient.post<{ data: Order }>('/api/orders', data),

  update: (id: string, data: UpdateOrderRequest) =>
    apiClient.patch<{ data: Order }>(`/api/orders/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/orders/${id}`),

  // Status actions
  confirm: (id: string) =>
    apiClient.post<{ data: Order }>(`/api/orders/${id}/confirm`),

  ship: (id: string, data: ShipOrderRequest) =>
    apiClient.post<{ data: Order }>(`/api/orders/${id}/ship`, data),

  deliver: (id: string) =>
    apiClient.post<{ data: Order }>(`/api/orders/${id}/deliver`),

  complete: (id: string) =>
    apiClient.post<{ data: Order }>(`/api/orders/${id}/complete`),

  cancel: (id: string, data?: CancelOrderRequest) =>
    apiClient.post<{ data: Order }>(`/api/orders/${id}/cancel`, data || {}),

  // Payment
  recordPayment: (id: string, method: string, amount: number, note?: string) =>
    apiClient.post<{ data: Order }>(`/api/orders/${id}/payment`, { method, amount, note }),

  // Next order number
  getNextNumber: () =>
    apiClient.get<{ data: { orderNumber: string } }>('/api/orders/next-number'),

  // Stats
  getStats: () =>
    apiClient.get<{ data: {
      pending: number
      processing: number
      shipped: number
      delivered: number
      cancelled: number
      totalOrders: number
      totalRevenue: number
      totalProfit: number
      avgOrderValue: number
      pendingCount: number
      pendingShipment: number
    } }>('/api/orders/stats'),
}
