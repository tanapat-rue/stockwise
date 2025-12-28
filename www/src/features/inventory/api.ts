import { apiClient } from '@/lib/api-client'
import type {
  StockLevel,
  StockListParams,
  StockListResponse,
  AdjustStockRequest,
  InventoryLot,
  StockMovement,
} from './types'

export const inventoryApi = {
  list: (params?: StockListParams) =>
    apiClient.get<StockListResponse>('/api/inventory/stock-levels', {
      ...params,
      lowStockOnly: params?.lowStock ? 'true' : undefined,
    } as Record<string, unknown>),

  get: (productId: string, branchId: string) =>
    apiClient.get<{ data: StockLevel }>(`/api/inventory/stock-levels/${productId}?branchId=${branchId}`),

  adjust: (data: AdjustStockRequest) =>
    apiClient.post<{ data: StockLevel }>('/api/inventory/adjustments', {
      productId: data.productId,
      branchId: data.branchId,
      type: data.quantity >= 0 ? 'ADD' : 'REMOVE',
      quantity: Math.abs(data.quantity),
      reason: data.reason,
      notes: data.notes,
    }),

  updateReorderPoint: (
    productId: string,
    branchId: string,
    reorderPoint: number,
    _reorderQuantity: number
  ) =>
    apiClient.patch<{ data: StockLevel }>(`/api/inventory/products/${productId}/reorder-point`, {
      branchId,
      reorderPoint,
    }),

  getLots: (productId: string, branchId?: string) =>
    apiClient.get<{ data: InventoryLot[] }>(
      `/api/inventory/products/${productId}/lots${branchId ? `?branchId=${branchId}` : ''}`
    ),

  getMovements: (productId: string, params?: { branchId?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: StockMovement[]; total: number }>(
      `/api/inventory/products/${productId}/movements`,
      params
    ),

  getLowStock: (branchId?: string) =>
    apiClient.get<{ data: StockLevel[] }>(
      `/api/inventory/low-stock${branchId ? `?branchId=${branchId}` : ''}`
    ),
}
