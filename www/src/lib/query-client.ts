import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
      onError: (error: Error) => {
        handleMutationError(error)
      },
    },
  },
})

function handleMutationError(error: Error) {
  if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
    toast.error('Network error. Please check your connection.')
  } else if ((error as Error & { status?: number }).status === 401) {
    // Handled by API client
  } else {
    toast.error(error.message || 'An error occurred')
  }
}

// Query key factory for consistent key management
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  // Organizations
  orgs: {
    all: ['orgs'] as const,
    list: () => [...queryKeys.orgs.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.orgs.all, 'detail', id] as const,
  },

  // Branches
  branches: {
    all: ['branches'] as const,
    list: () => [...queryKeys.branches.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.branches.all, 'detail', id] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.products.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.categories.all, 'detail', id] as const,
  },

  // Inventory / Stock
  inventory: {
    all: ['inventory'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.inventory.all, 'list', filters] as const,
    detail: (productId: string, branchId: string) => [...queryKeys.inventory.all, 'detail', productId, branchId] as const,
    lots: (productId: string, branchId?: string) => [...queryKeys.inventory.all, 'lots', productId, branchId] as const,
  },

  // Orders
  orders: {
    all: ['orders'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.orders.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
    timeline: (id: string) => [...queryKeys.orders.all, 'timeline', id] as const,
    stats: () => [...queryKeys.orders.all, 'stats'] as const,
    nextNumber: () => [...queryKeys.orders.all, 'nextNumber'] as const,
  },

  // Purchase Orders
  purchaseOrders: {
    all: ['purchaseOrders'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.purchaseOrders.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.purchaseOrders.all, 'detail', id] as const,
    stats: () => [...queryKeys.purchaseOrders.all, 'stats'] as const,
    nextNumber: () => [...queryKeys.purchaseOrders.all, 'nextNumber'] as const,
  },

  // Customers
  customers: {
    all: ['customers'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.customers.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.customers.all, 'detail', id] as const,
  },

  // Suppliers
  suppliers: {
    all: ['suppliers'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.suppliers.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.suppliers.all, 'detail', id] as const,
  },

  // Returns
  returns: {
    all: ['returns'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.returns.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.returns.all, 'detail', id] as const,
  },

  // Reports
  reports: {
    all: ['reports'] as const,
    sales: (params?: Record<string, unknown>) => [...queryKeys.reports.all, 'sales', params] as const,
    inventory: (params?: Record<string, unknown>) => [...queryKeys.reports.all, 'inventory', params] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    list: () => [...queryKeys.users.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },
}
