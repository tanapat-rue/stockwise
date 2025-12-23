import { apiClient, ApiResponse, PaginatedResponse } from '@/lib/api-client';
import type {
  StockLevel,
  StockLevelFilters,
  StockMovement,
  StockMovementFilters,
  Lot,
  LotFilters,
  StockAdjustment,
  BulkStockAdjustment,
  StockTransfer,
  CreateStockTransfer,
  StockSummary,
} from './types';

export const inventoryApi = {
  // Stock Levels
  getStockLevels: (filters?: StockLevelFilters) =>
    apiClient.get<PaginatedResponse<StockLevel>>('/inventory/stock-levels', { params: filters }),

  getStockLevel: (productId: string, branchId: string, variantId?: string) =>
    apiClient.get<ApiResponse<StockLevel>>(`/inventory/stock-levels/${productId}`, {
      params: { branchId, variantId },
    }),

  getProductStock: (productId: string) =>
    apiClient.get<ApiResponse<StockLevel[]>>(`/inventory/products/${productId}/stock`),

  getLowStockProducts: (branchId?: string) =>
    apiClient.get<ApiResponse<StockLevel[]>>('/inventory/low-stock', { params: { branchId } }),

  getOutOfStockProducts: (branchId?: string) =>
    apiClient.get<ApiResponse<StockLevel[]>>('/inventory/out-of-stock', { params: { branchId } }),

  // Stock Movements
  getMovements: (filters?: StockMovementFilters) =>
    apiClient.get<PaginatedResponse<StockMovement>>('/inventory/movements', { params: filters }),

  getMovement: (id: string) =>
    apiClient.get<ApiResponse<StockMovement>>(`/inventory/movements/${id}`),

  getProductMovements: (productId: string, filters?: Omit<StockMovementFilters, 'productId'>) =>
    apiClient.get<PaginatedResponse<StockMovement>>(`/inventory/products/${productId}/movements`, {
      params: filters,
    }),

  // Stock Adjustments
  adjustStock: (adjustment: StockAdjustment) =>
    apiClient.post<ApiResponse<StockMovement>>('/inventory/adjustments', adjustment),

  bulkAdjustStock: (adjustment: BulkStockAdjustment) =>
    apiClient.post<ApiResponse<StockMovement[]>>('/inventory/adjustments/bulk', adjustment),

  // Lots
  getLots: (filters?: LotFilters) =>
    apiClient.get<PaginatedResponse<Lot>>('/inventory/lots', { params: filters }),

  getLot: (id: string) =>
    apiClient.get<ApiResponse<Lot>>(`/inventory/lots/${id}`),

  getProductLots: (productId: string, branchId?: string) =>
    apiClient.get<ApiResponse<Lot[]>>(`/inventory/products/${productId}/lots`, {
      params: { branchId },
    }),

  createLot: (data: Omit<Lot, 'id' | 'availableQuantity' | 'status' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<ApiResponse<Lot>>('/inventory/lots', data),

  updateLot: (id: string, data: Partial<Lot>) =>
    apiClient.patch<ApiResponse<Lot>>(`/inventory/lots/${id}`, data),

  // Stock Transfers
  getTransfers: (filters?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<StockTransfer>>('/inventory/transfers', { params: filters }),

  getTransfer: (id: string) =>
    apiClient.get<ApiResponse<StockTransfer>>(`/inventory/transfers/${id}`),

  createTransfer: (data: CreateStockTransfer) =>
    apiClient.post<ApiResponse<StockTransfer>>('/inventory/transfers', data),

  updateTransfer: (id: string, data: Partial<CreateStockTransfer>) =>
    apiClient.patch<ApiResponse<StockTransfer>>(`/inventory/transfers/${id}`, data),

  sendTransfer: (id: string) =>
    apiClient.post<ApiResponse<StockTransfer>>(`/inventory/transfers/${id}/send`),

  receiveTransfer: (id: string, items: { productId: string; variantId?: string; receivedQuantity: number }[]) =>
    apiClient.post<ApiResponse<StockTransfer>>(`/inventory/transfers/${id}/receive`, { items }),

  cancelTransfer: (id: string, reason?: string) =>
    apiClient.post<ApiResponse<StockTransfer>>(`/inventory/transfers/${id}/cancel`, { reason }),

  // Summary/Dashboard
  getSummary: (branchId?: string) =>
    apiClient.get<ApiResponse<StockSummary>>('/inventory/summary', { params: { branchId } }),

  // Set reorder point
  setReorderPoint: (productId: string, branchId: string, reorderPoint: number, variantId?: string) =>
    apiClient.patch<ApiResponse<StockLevel>>(`/inventory/products/${productId}/reorder-point`, {
      branchId,
      variantId,
      reorderPoint,
    }),
};
