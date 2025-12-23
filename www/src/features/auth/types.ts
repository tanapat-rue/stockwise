export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  orgId: string;
  branchId?: string;
}

export type UserRole = 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'BRANCH_MANAGER' | 'STAFF';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  settings?: OrganizationSettings;
}

export interface OrganizationSettings {
  taxId?: string;
  branchNumber?: string;
  vatRate?: number;
  profitCalculationMethod?: 'MOVING_AVG' | 'FIFO';
  lowStockThreshold?: number;
  documentNumberPrefixes?: {
    invoice?: string;
    receipt?: string;
    quotation?: string;
    purchaseOrder?: string;
    salesOrder?: string;
  };
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  isMain: boolean;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  organization: Organization;
  organizations: Organization[];
  branches: Branch[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  orgName: string;
}

// Permission constants
export const PERMISSIONS = {
  // Products
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_EDIT: 'products:edit',
  PRODUCTS_DELETE: 'products:delete',

  // Categories
  CATEGORIES_VIEW: 'categories:view',
  CATEGORIES_CREATE: 'categories:create',
  CATEGORIES_EDIT: 'categories:edit',
  CATEGORIES_DELETE: 'categories:delete',

  // Stock
  STOCK_VIEW: 'stock:view',
  STOCK_ADJUST: 'stock:adjust',
  STOCK_TRANSFER: 'stock:transfer',

  // Orders
  ORDERS_VIEW: 'orders:view',
  ORDERS_CREATE: 'orders:create',
  ORDERS_EDIT: 'orders:edit',
  ORDERS_DELETE: 'orders:delete',
  ORDERS_PROCESS: 'orders:process',

  // Purchase Orders
  PURCHASE_ORDERS_VIEW: 'purchase-orders:view',
  PURCHASE_ORDERS_CREATE: 'purchase-orders:create',
  PURCHASE_ORDERS_EDIT: 'purchase-orders:edit',
  PURCHASE_ORDERS_DELETE: 'purchase-orders:delete',
  PURCHASE_ORDERS_RECEIVE: 'purchase-orders:receive',

  // Contacts
  CONTACTS_VIEW: 'contacts:view',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_EDIT: 'contacts:edit',
  CONTACTS_DELETE: 'contacts:delete',

  // Documents
  DOCUMENTS_VIEW: 'documents:view',
  DOCUMENTS_CREATE: 'documents:create',
  DOCUMENTS_VOID: 'documents:void',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',

  // Users
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
