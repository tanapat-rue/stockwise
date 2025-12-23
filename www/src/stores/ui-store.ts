import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Command palette
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  // Mobile menu
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  // Sidebar
  sidebarOpen: true,
  sidebarCollapsed: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Command palette
  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  // Mobile menu
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));

// Settings store (persisted)
interface SettingsStore {
  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Language
  language: 'en' | 'th';
  setLanguage: (language: 'en' | 'th') => void;

  // Currency
  currency: 'THB' | 'USD';
  setCurrency: (currency: 'THB' | 'USD') => void;

  // Date format
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  setDateFormat: (format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD') => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      language: 'en',
      setLanguage: (language) => set({ language }),

      currency: 'THB',
      setCurrency: (currency) => set({ currency }),

      dateFormat: 'DD/MM/YYYY',
      setDateFormat: (dateFormat) => set({ dateFormat }),
    }),
    {
      name: 'stockflows-settings',
    }
  )
);

// Auth store (session context)
interface User {
  id: string;
  email: string;
  name: string;
  role: 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'BRANCH_MANAGER' | 'STAFF';
  permissions: string[];
  orgId: string;
  branchId?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  isMain: boolean;
}

interface AuthStore {
  user: User | null;
  organization: Organization | null;
  branch: Branch | null;
  organizations: Organization[];
  branches: Branch[];
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  setBranch: (branch: Branch | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setBranches: (branches: Branch[]) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;

  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: User['role'][]) => boolean;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  organization: null,
  branch: null,
  organizations: [],
  branches: [],
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setOrganization: (organization) => set({ organization }),
  setBranch: (branch) => set({ branch }),
  setOrganizations: (organizations) => set({ organizations }),
  setBranches: (branches) => set({ branches }),
  setIsLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({
      user: null,
      organization: null,
      branch: null,
      organizations: [],
      branches: [],
      isAuthenticated: false,
    }),

  hasPermission: (permission) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'PLATFORM_ADMIN' || user.role === 'ORG_ADMIN') return true;
    return user.permissions.includes(permission);
  },

  hasRole: (...roles) => {
    const { user } = get();
    if (!user) return false;
    return roles.includes(user.role);
  },
}));
