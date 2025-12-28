import { create } from 'zustand'

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  // Command palette
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void

  // Mobile menu
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void

  // Warehouse mode
  isWarehouseMode: boolean
  setWarehouseMode: (enabled: boolean) => void

  // Last scanned barcode (placeholder for future)
  lastScannedBarcode: string | null
  setLastScannedBarcode: (barcode: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  sidebarCollapsed: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () =>
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    })),

  // Command palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  // Mobile menu
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  // Warehouse mode
  isWarehouseMode: false,
  setWarehouseMode: (enabled) => set({ isWarehouseMode: enabled }),

  // Barcode
  lastScannedBarcode: null,
  setLastScannedBarcode: (barcode) => set({ lastScannedBarcode: barcode }),
}))
