export type Role = 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'BRANCH_MANAGER' | 'STAFF';
export type Language = 'en' | 'th';
export type Currency = 'USD' | 'THB';
export type Channel = 'POS' | 'SHOPEE' | 'LAZADA' | 'TIKTOK' | 'WEB';

// Fulfillment Workflow:
// PENDING (New) -> PICKED (Warehouse) -> PACKED (Ready) -> SHIPPED (Carrier) -> DELIVERED (Customer)
// Exceptions: RETURNED, CANCELLED
export type FulfillmentStatus = 'PENDING' | 'PICKED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: Role;
  orgId: string;
  branchId?: string;
  isActive?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  taxId?: string;
  address?: string;
}

export interface Branch {
  id: string;
  orgId: string;
  name: string;
  address?: string;
  isMain: boolean;
}

export interface Customer {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  points: number;
  totalSpent: number;
}

export interface Supplier {
  id: string;
  orgId: string;
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  address?: string;
  taxId?: string;
}

export interface StockLevel {
  productId: string;
  branchId: string;
  quantity: number; // This is PHYSICAL stock (On Hand)
  reserved?: number; // Reserved for PENDING/PICKED/PACKED/SHIPPED orders
  minStock: number;
  binLocation?: string;
}

export interface Product {
  id: string;
  orgId: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  category: string;
  image?: string;
  imageKey?: string;
  weight?: number; // in grams
  dimensions?: string; // LxWxH
}

export interface CartItem extends Product {
  quantity: number;
}

export interface HeldOrder {
  id: string;
  customer: Customer | null;
  items: CartItem[];
  timestamp: string;
  note?: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string; 
  quantity: number;
  unitCost: number; 
}

export interface PurchaseOrder {
  id: string;
  orgId: string;
  branchId: string;
  referenceNo: string;
  date: string;
  supplierId: string;
  status: 'OPEN' | 'RECEIVING' | 'RECEIVED' | 'CANCELLED';
  items: PurchaseOrderItem[];
  totalCost: number;
  note?: string;
  receivedDate?: string;
}

export interface ShippingInfo {
  carrier: string;
  trackingNumber: string;
  labelUrl?: string;
  shippedDate?: string;
  deliveredDate?: string;
}

export interface TransactionItem {
  id: string;
  sku: string;
  name: string;
  category?: string;
  image?: string;
  price: number;
  cost: number;
  lineCost?: number;
  quantity: number;
}

export interface Transaction {
  id: string;
  orgId: string;
  branchId: string;
  date: string; 
  channel: Channel;
  type: 'SALE' | 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
  
  // Financial Status
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'REFUNDED'; 
  
  // Logistic Status
  fulfillmentStatus: FulfillmentStatus; 
  
  items: TransactionItem[];
  total: number;
  cogs?: number;
  profit?: number;
  stockCommitted?: boolean;
  userId: string;
  
  // Decoupled Customer Data
  customerId?: string; 
  recipientName: string; 
  recipientPhone?: string;
  recipientAddress?: string;

  paymentMethod?: 'CASH' | 'QR' | 'CARD' | 'TRANSFER' | 'COD';
  note?: string;
  cancellationReason?: string; // Track why it was cancelled
  referenceId?: string; 
  shippingInfo?: ShippingInfo;
  costLines?: Array<{ productId: string; lotId: string; quantity: number; unitCost: number; amount: number }>;
}

export interface AppSettings {
  language: Language;
  currency: Currency;
  themeColor: string; 
  isDark: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
