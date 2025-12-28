export type OrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'

export type FulfillmentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED'

export interface ShippingInfo {
  carrier?: string
  trackingNumber?: string
  labelUrl?: string
  shippedDate?: string
  deliveredDate?: string
}

export interface Recipient {
  name?: string
  phone?: string
  address?: string
  city?: string
  province?: string
  postalCode?: string
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productSku: string
  unit: string
  quantity: number
  unitPrice: number // in satang
  discount: number
  lineTotal: number
  unitCost: number
  lineCost: number
}

export interface Order {
  id: string
  orgId: string
  branchId: string
  branchName?: string
  orderNumber: string
  channel: string
  orderDate: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  status: OrderStatus
  fulfillmentStatus: FulfillmentStatus
  paymentStatus: PaymentStatus
  items: OrderItem[]
  subtotal: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  shippingCost: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  totalCost: number
  grossProfit: number
  shipping?: ShippingInfo
  recipient?: Recipient
  customerNote?: string
  internalNote?: string
  createdAt: string
  updatedAt: string
}

export interface OrderListParams {
  search?: string
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  customerId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface OrderListResponse {
  data: Order[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateOrderItem {
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  discount?: number
}

export interface CreateOrderRequest {
  branchId?: string
  channel?: string
  orderDate?: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  items: CreateOrderItem[]
  discountAmount?: number
  taxRate?: number
  shippingCost?: number
  customerNote?: string
  internalNote?: string
  recipient?: {
    name: string
    phone: string
    address: string
    city?: string
    province?: string
    postalCode?: string
  }
  saveAsDraft?: boolean
}

export interface UpdateOrderRequest extends Partial<CreateOrderRequest> {
  status?: OrderStatus
}

export interface ShipOrderRequest {
  carrier: string
  trackingNumber: string
}

export interface CancelOrderRequest {
  reason?: string
  restock?: boolean
}
