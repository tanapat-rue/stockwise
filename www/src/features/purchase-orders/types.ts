// Purchase Order Types
export type POStatus = 'DRAFT' | 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
export type POPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface PurchaseOrder {
  id: string;
  orgId: string;
  branchId: string;
  branchName: string;

  // Order info
  orderNumber: string;
  referenceNumber?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  shippingDate?: string;
  receivedDate?: string;

  // Supplier
  supplierId: string;
  supplierName: string;
  supplierCode?: string;

  // Status
  status: POStatus;
  paymentStatus: POPaymentStatus;

  // Items
  items: PurchaseOrderItem[];

  // Totals
  subtotal: number;
  discountAmount: number;
  discountPercent?: number;
  taxRate: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;

  // Shipping
  shippingChannel?: string;

  // Notes
  notes?: string;
  internalNotes?: string;

  // Metadata
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  variantId?: string;
  variantName?: string;
  variantSku?: string;
  unit: string;

  // Quantities
  qtyOrdered: number;
  qtyReceived: number;
  qtyPending: number;

  // Pricing
  unitCost: number;
  discount: number;
  discountPercent?: number;
  lineTotal: number;

  // Lot info (for receiving)
  lotNumber?: string;
  expiryDate?: string;
}

// Filters
export interface PurchaseOrderFilters {
  status?: POStatus;
  paymentStatus?: POPaymentStatus;
  supplierId?: string;
  branchId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Form values
export interface PurchaseOrderFormValues {
  branchId: string;
  supplierId: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  referenceNumber?: string;
  items: PurchaseOrderItemFormValues[];
  discountAmount?: number;
  discountPercent?: number;
  taxRate: number;
  shippingCost?: number;
  shippingChannel?: string;
  notes?: string;
  internalNotes?: string;
}

export interface PurchaseOrderItemFormValues {
  productId: string;
  variantId?: string;
  qtyOrdered: number;
  unitCost: number;
  discount?: number;
  discountPercent?: number;
}

// Receive items
export interface ReceiveItemsPayload {
  items: {
    itemId: string;
    qtyReceived: number;
    lotNumber?: string;
    expiryDate?: string;
  }[];
  notes?: string;
}

// Status labels
export const poStatusLabels: Record<POStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  PARTIAL: 'Partially Received',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};

export const poStatusColors: Record<POStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PENDING: 'secondary',
  PARTIAL: 'default',
  RECEIVED: 'default',
  CANCELLED: 'destructive',
};

export const paymentStatusLabels: Record<POPaymentStatus, string> = {
  UNPAID: 'Unpaid',
  PARTIAL: 'Partially Paid',
  PAID: 'Paid',
};

export const paymentStatusColors: Record<POPaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  UNPAID: 'destructive',
  PARTIAL: 'secondary',
  PAID: 'default',
};
