import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Query key factories for consistent cache management
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  // Organizations
  orgs: {
    all: ['organizations'] as const,
    list: () => [...queryKeys.orgs.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.orgs.all, 'detail', id] as const,
  },

  // Branches
  branches: {
    all: ['branches'] as const,
    list: () => [...queryKeys.branches.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.branches.all, 'detail', id] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.users.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
    tree: () => [...queryKeys.categories.all, 'tree'] as const,
    detail: (id: string) => [...queryKeys.categories.all, 'detail', id] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.products.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
    variants: (productId: string) => [...queryKeys.products.all, 'variants', productId] as const,
  },

  // Inventory
  inventory: {
    all: ['inventory'] as const,
    // Stock levels
    stockLevels: (filters?: Record<string, unknown>) => [...queryKeys.inventory.all, 'stock-levels', filters] as const,
    stockLevel: (productId: string, branchId: string, variantId?: string) =>
      [...queryKeys.inventory.all, 'stock-level', productId, branchId, variantId] as const,
    productStock: (productId: string) => [...queryKeys.inventory.all, 'product-stock', productId] as const,
    lowStock: (branchId?: string) => [...queryKeys.inventory.all, 'low-stock', branchId] as const,
    outOfStock: (branchId?: string) => [...queryKeys.inventory.all, 'out-of-stock', branchId] as const,
    // Movements
    movements: (filters?: Record<string, unknown>) => [...queryKeys.inventory.all, 'movements', filters] as const,
    movement: (id: string) => [...queryKeys.inventory.all, 'movement', id] as const,
    productMovements: (productId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.inventory.all, 'product-movements', productId, filters] as const,
    // Lots
    lots: (filters?: Record<string, unknown>) => [...queryKeys.inventory.all, 'lots', filters] as const,
    lot: (id: string) => [...queryKeys.inventory.all, 'lot', id] as const,
    productLots: (productId: string, branchId?: string) =>
      [...queryKeys.inventory.all, 'product-lots', productId, branchId] as const,
    // Transfers
    transfers: (filters?: Record<string, unknown>) => [...queryKeys.inventory.all, 'transfers', filters] as const,
    transfer: (id: string) => [...queryKeys.inventory.all, 'transfer', id] as const,
    // Summary
    summary: (branchId?: string) => [...queryKeys.inventory.all, 'summary', branchId] as const,
  },

  // Contacts
  contacts: {
    all: ['contacts'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.contacts.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.contacts.all, 'detail', id] as const,
    customers: (filters?: Record<string, unknown>) => [...queryKeys.contacts.all, 'customers', filters] as const,
    suppliers: (filters?: Record<string, unknown>) => [...queryKeys.contacts.all, 'suppliers', filters] as const,
  },

  // Purchase Orders
  purchaseOrders: {
    all: ['purchase-orders'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.purchaseOrders.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.purchaseOrders.all, 'detail', id] as const,
    nextReference: () => [...queryKeys.purchaseOrders.all, 'next-reference'] as const,
  },

  // Orders
  orders: {
    all: ['orders'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.orders.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
    timeline: (id: string) => [...queryKeys.orders.all, 'timeline', id] as const,
  },

  // Documents
  documents: {
    all: ['documents'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.documents.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.documents.all, 'detail', id] as const,
  },

  // Reports
  reports: {
    all: ['reports'] as const,
    salesSummary: (filters?: Record<string, unknown>) => [...queryKeys.reports.all, 'sales-summary', filters] as const,
    salesByProduct: (filters?: Record<string, unknown>) => [...queryKeys.reports.all, 'sales-by-product', filters] as const,
    salesByCategory: (filters?: Record<string, unknown>) => [...queryKeys.reports.all, 'sales-by-category', filters] as const,
    salesTrend: (filters?: Record<string, unknown>) => [...queryKeys.reports.all, 'sales-trend', filters] as const,
    inventoryValue: (filters?: Record<string, unknown>) => [...queryKeys.reports.all, 'inventory-value', filters] as const,
    customerSummary: (filters?: Record<string, unknown>) => [...queryKeys.reports.all, 'customer-summary', filters] as const,
  },
};
