// Order Types
export type OrderStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
export type FulfillmentStatus = 'PENDING' | 'PICKING' | 'PICKED' | 'PACKING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type SalesChannel = 'POS' | 'WEB' | 'SHOPEE' | 'LAZADA' | 'TIKTOK' | 'FACEBOOK' | 'LINE' | 'OTHER';

export interface Order {
  id: string;
  orgId: string;
  branchId: string;
  branchName: string;

  // Order info
  orderNumber: string;
  externalOrderId?: string;
  channel: SalesChannel;
  orderDate: string;

  // Customer
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;

  // Recipient (can be different from customer)
  recipient: {
    name: string;
    phone: string;
    address: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };

  // Status
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;

  // Items
  items: OrderItem[];

  // Payments
  payments: OrderPayment[];

  // Shipping
  shipping: {
    carrier?: string;
    trackingNumber?: string;
    labelUrl?: string;
    shippingDate?: string;
    shippedAt?: string;
    deliveredAt?: string;
  };

  // Totals
  subtotal: number;
  discountAmount: number;
  discountCode?: string;
  taxRate: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;

  // Cost/Profit
  totalCost: number;
  grossProfit: number;
  profitMargin: number;

  // Notes
  customerNote?: string;
  internalNote?: string;

  // Metadata
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  variantId?: string;
  variantName?: string;
  variantSku?: string;
  unit: string;

  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;

  // Cost for profit calculation
  unitCost: number;
  lineCost: number;

  // Lot allocation (for FIFO)
  lotAllocations?: {
    lotId: string;
    lotNumber: string;
    quantity: number;
  }[];
}

export interface OrderPayment {
  id: string;
  method: string;
  amount: number;
  reference?: string;
  paidAt: string;
  createdBy: string;
}

// Filters
export interface OrderFilters {
  status?: OrderStatus;
  fulfillmentStatus?: FulfillmentStatus;
  paymentStatus?: PaymentStatus;
  channel?: SalesChannel;
  customerId?: string;
  branchId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Form values
export interface OrderFormValues {
  branchId: string;
  channel: SalesChannel;
  orderDate: string;
  externalOrderId?: string;

  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;

  recipient: {
    name: string;
    phone: string;
    address: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };

  items: OrderItemFormValues[];

  discountAmount?: number;
  discountCode?: string;
  taxRate: number;
  shippingCost?: number;

  shipping?: {
    carrier?: string;
    trackingNumber?: string;
    shippingDate?: string;
  };

  customerNote?: string;
  internalNote?: string;
}

export interface OrderItemFormValues {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

// Quick Add (POS mode)
export interface QuickAddOrder {
  branchId: string;
  channel: SalesChannel;
  customerName?: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }[];
  paymentMethod: string;
  paymentAmount: number;
  discountAmount?: number;
}

// Status labels
export const orderStatusLabels: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const orderStatusColors: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PENDING: 'secondary',
  CONFIRMED: 'default',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
  REFUNDED: 'destructive',
};

export const fulfillmentStatusLabels: Record<FulfillmentStatus, string> = {
  PENDING: 'Pending',
  PICKING: 'Picking',
  PICKED: 'Picked',
  PACKING: 'Packing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  UNPAID: 'Unpaid',
  PARTIAL: 'Partial',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
};

export const paymentStatusColors: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  UNPAID: 'destructive',
  PARTIAL: 'secondary',
  PAID: 'default',
  REFUNDED: 'outline',
};

export const salesChannelLabels: Record<SalesChannel, string> = {
  POS: 'POS',
  WEB: 'Website',
  SHOPEE: 'Shopee',
  LAZADA: 'Lazada',
  TIKTOK: 'TikTok Shop',
  FACEBOOK: 'Facebook',
  LINE: 'LINE',
  OTHER: 'Other',
};

// Payment methods
export const paymentMethods = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'PROMPTPAY', label: 'PromptPay' },
  { value: 'COD', label: 'Cash on Delivery' },
  { value: 'OTHER', label: 'Other' },
];
