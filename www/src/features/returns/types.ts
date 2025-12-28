export type ReturnType = 'CUSTOMER' | 'SUPPLIER'

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'

export type ReturnReason = 'DEFECTIVE' | 'WRONG_ITEM' | 'DAMAGED' | 'QUALITY' | 'OTHER'

export type ItemCondition = 'NEW' | 'LIKE_NEW' | 'USED' | 'DAMAGED' | 'UNSELLABLE'

export type ReturnResolution = 'REFUND' | 'EXCHANGE' | 'CREDIT' | 'REPLACE'

export interface ReturnItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  reason: ReturnReason
  condition: ItemCondition
  restockable: boolean
  notes?: string
}

export interface Return {
  id: string
  orgId: string
  branchId: string
  refNo: string
  type: ReturnType
  status: ReturnStatus
  orderId?: string
  orderNumber?: string
  poId?: string
  poNumber?: string
  customerId?: string
  customerName?: string
  supplierId?: string
  supplierName?: string
  items: ReturnItem[]
  resolution?: ReturnResolution
  refundAmount?: number
  creditAmount?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ReturnListParams {
  search?: string
  type?: ReturnType
  status?: ReturnStatus
  page?: number
  limit?: number
}

export interface ReturnListResponse {
  data: Return[]
  total: number
  page: number
  limit: number
}

export interface CreateReturnRequest {
  type: ReturnType
  orderId?: string
  poId?: string
  items: Array<{
    productId: string
    quantity: number
    reason: ReturnReason
    condition: ItemCondition
    restockable: boolean
    notes?: string
  }>
  notes?: string
}
