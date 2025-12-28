export interface StockLevel {
  id: string
  orgId: string
  branchId: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  reserved: number
  availableQuantity: number
  minStock: number
  binLocation?: string
  averageCost?: number
  isLowStock: boolean
  isOutOfStock: boolean
  version: number
  updatedAt: string
}

export interface InventoryLot {
  id: string
  orgId: string
  branchId: string
  productId: string
  productName: string
  productSku: string
  lotNumber?: string
  quantity: number
  remaining: number
  unitCost: number
  source: 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER'
  sourceId?: string
  expiryDate?: string
  createdAt: string
}

export interface StockListParams {
  search?: string
  branchId?: string
  lowStock?: boolean
  page?: number
  limit?: number
}

export interface StockListResponse {
  data: StockLevel[]
  total: number
  page: number
  limit: number
}

export interface AdjustStockRequest {
  productId: string
  branchId: string
  quantity: number // positive for add, negative for subtract
  reason: string
  notes?: string
}

export interface StockMovement {
  id: string
  orgId: string
  branchId: string
  productId: string
  productName: string
  type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN_IN' | 'RETURN_OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT'
  quantity: number
  referenceId?: string
  referenceType?: string
  notes?: string
  userId: string
  userName: string
  createdAt: string
}
