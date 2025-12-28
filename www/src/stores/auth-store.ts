import { create } from 'zustand'

export interface User {
  id: string
  name: string
  email: string
  role: 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'BRANCH_MANAGER' | 'STAFF'
  orgId: string
  branchId?: string
  isActive: boolean
}

export interface Organization {
  id: string
  name: string
  taxId?: string
  address?: string
  plan?: string
}

export interface Branch {
  id: string
  orgId: string
  name: string
  address?: string
  isMain: boolean
}

interface AuthState {
  user: User | null
  organization: Organization | null
  branch: Branch | null
  organizations: Organization[]
  branches: Branch[]
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setUser: (user: User | null) => void
  setOrganization: (org: Organization | null) => void
  setBranch: (branch: Branch | null) => void
  setOrganizations: (orgs: Organization[]) => void
  setBranches: (branches: Branch[]) => void
  setLoading: (loading: boolean) => void
  logout: () => void

  // Helpers
  hasRole: (...roles: User['role'][]) => boolean
  hasPermission: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  organization: null,
  branch: null,
  organizations: [],
  branches: [],
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  setOrganization: (organization) => set({ organization }),

  setBranch: (branch) => set({ branch }),

  setOrganizations: (organizations) => set({ organizations }),

  setBranches: (branches) => set({ branches }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({
      user: null,
      organization: null,
      branch: null,
      organizations: [],
      branches: [],
      isAuthenticated: false,
    }),

  hasRole: (...roles) => {
    const { user } = get()
    if (!user) return false
    return roles.includes(user.role)
  },

  hasPermission: (permission) => {
    const { user } = get()
    if (!user) return false

    // Platform admin has all permissions
    if (user.role === 'PLATFORM_ADMIN') return true

    // Define role-based permissions
    const rolePermissions: Record<User['role'], string[]> = {
      PLATFORM_ADMIN: ['*'],
      ORG_ADMIN: [
        'products:read',
        'products:write',
        'orders:read',
        'orders:write',
        'purchaseOrders:read',
        'purchaseOrders:write',
        'customers:read',
        'customers:write',
        'suppliers:read',
        'suppliers:write',
        'stock:read',
        'stock:write',
        'reports:read',
        'users:read',
        'users:write',
        'settings:read',
        'settings:write',
      ],
      BRANCH_MANAGER: [
        'products:read',
        'orders:read',
        'orders:write',
        'purchaseOrders:read',
        'purchaseOrders:write',
        'customers:read',
        'customers:write',
        'suppliers:read',
        'stock:read',
        'stock:write',
        'reports:read',
      ],
      STAFF: [
        'products:read',
        'orders:read',
        'orders:write',
        'customers:read',
        'stock:read',
      ],
    }

    const permissions = rolePermissions[user.role] || []
    return permissions.includes('*') || permissions.includes(permission)
  },
}))
