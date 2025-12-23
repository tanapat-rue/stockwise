import { apiClient, ApiResponse, PaginatedResponse } from '@/lib/api-client';
import type {
  Order,
  OrderFilters,
  OrderFormValues,
  QuickAddOrder,
  OrderStatus,
  FulfillmentStatus,
} from './types';

export const ordersApi = {
  // CRUD
  list: (filters?: OrderFilters) =>
    apiClient.get<PaginatedResponse<Order>>('/orders', filters as Record<string, string | number | boolean | undefined>),

  get: (id: string) =>
    apiClient.get<ApiResponse<Order>>(`/orders/${id}`),

  create: (data: OrderFormValues) =>
    apiClient.post<ApiResponse<Order>>('/orders', data),

  update: (id: string, data: Partial<OrderFormValues>) =>
    apiClient.patch<ApiResponse<Order>>(`/orders/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/orders/${id}`),

  // Quick Add (POS mode)
  quickAdd: (data: QuickAddOrder) =>
    apiClient.post<ApiResponse<Order>>('/orders/quick', data),

  // Status updates
  updateStatus: (id: string, status: OrderStatus, notes?: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/status`, { status, notes }),

  updateFulfillmentStatus: (id: string, status: FulfillmentStatus, notes?: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/fulfillment`, { status, notes }),

  // Confirm order
  confirm: (id: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/confirm`),

  // Complete order
  complete: (id: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/complete`),

  // Cancel order
  cancel: (id: string, reason?: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/cancel`, { reason }),

  // Refund
  refund: (id: string, amount: number, reason?: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/refund`, { amount, reason }),

  // Payment
  recordPayment: (id: string, method: string, amount: number, reference?: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/payment`, {
      method,
      amount,
      reference,
    }),

  // Shipping
  updateShipping: (
    id: string,
    shipping: { carrier?: string; trackingNumber?: string; shippedAt?: string }
  ) => apiClient.patch<ApiResponse<Order>>(`/orders/${id}/shipping`, shipping),

  markShipped: (id: string, trackingNumber?: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/ship`, { trackingNumber }),

  markDelivered: (id: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/deliver`),

  // Duplicate
  duplicate: (id: string) =>
    apiClient.post<ApiResponse<Order>>(`/orders/${id}/duplicate`),

  // Get next order number
  getNextNumber: () =>
    apiClient.get<ApiResponse<{ orderNumber: string }>>('/orders/next-number'),

  // Bulk operations
  bulkUpdateStatus: (ids: string[], status: OrderStatus) =>
    apiClient.post<ApiResponse<void>>('/orders/bulk-status', { ids, status }),

  bulkProcess: (ids: string[]) =>
    apiClient.post<ApiResponse<void>>('/orders/bulk-process', { ids }),

  // Timeline/History
  getTimeline: (id: string) =>
    apiClient.get<ApiResponse<{
      events: {
        id: string;
        type: string;
        description: string;
        createdBy: string;
        createdAt: string;
      }[];
    }>>(`/orders/${id}/timeline`),

  // Stats
  getStats: (filters?: { startDate?: string; endDate?: string; branchId?: string }) =>
    apiClient.get<ApiResponse<{
      totalOrders: number;
      totalRevenue: number;
      totalProfit: number;
      avgOrderValue: number;
      pendingCount: number;
      pendingShipment: number;
    }>>('/orders/stats', filters),
};
