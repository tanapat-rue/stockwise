export type POStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PARTIAL'
  | 'RECEIVED'
  | 'CANCELLED'

export type POPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'

export interface POItem {
  id: string
  productId: string
  productName: string
  productSku: string
  unit: string
  qtyOrdered: number
  qtyReceived: number
  qtyPending: number
  unitCost: number // in satang
  discount: number
  lineTotal: number
}

export interface PurchaseOrder {
  id: string
  orgId: string
  branchId: string
  branchName?: string
  orderNumber: string
  referenceNumber?: string
  orderDate: string
  expectedDeliveryDate?: string
  receivedDate?: string
  supplierId: string
  supplierName: string
  supplierCode?: string
  status: POStatus
  paymentStatus: POPaymentStatus
  items: POItem[]
  subtotal: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  shippingCost: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  notes?: string
  internalNotes?: string
  createdBy?: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

export interface POListParams {
  search?: string
  status?: POStatus
  supplierId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface POListResponse {
  data: PurchaseOrder[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreatePOItemRequest {
  productId: string
  productName?: string
  productSku?: string
  qtyOrdered?: number
  quantity?: number // Alias for qtyOrdered
  unitCost: number
  discount?: number
}

export interface CreatePORequest {
  branchId: string
  supplierId: string
  referenceNo?: string
  referenceNumber?: string // Alias
  orderDate?: string
  expectedDeliveryDate?: string
  items: CreatePOItemRequest[]
  discountAmount?: number
  taxRate?: number
  shippingCost?: number
  shippingChannel?: string
  notes?: string
  internalNotes?: string
}

export interface UpdatePORequest extends Partial<CreatePORequest> {}

export interface ReceivePORequest {
  items?: Array<{
    productId: string
    receivedQuantity: number
  }>
}

export interface RecordPOPaymentRequest {
  amount: number
  method?: string
  reference?: string
}
