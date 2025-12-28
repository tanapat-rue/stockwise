import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { useAuth } from '@/features/auth'
import { Spinner } from '@/components/ui/spinner'

// Layout - loaded immediately since it's the shell
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Auth Pages - loaded immediately for fast login
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'

// Lazy loaded pages for code splitting
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage').then(m => ({ default: m.ProductsPage })))
const StockPage = lazy(() => import('@/pages/stock/StockPage').then(m => ({ default: m.StockPage })))
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage').then(m => ({ default: m.OrdersPage })))
const OrderFormPage = lazy(() => import('@/pages/orders/OrderFormPage').then(m => ({ default: m.OrderFormPage })))
const OrderDetailPage = lazy(() => import('@/pages/orders/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })))
const PurchaseOrdersPage = lazy(() => import('@/pages/purchase-orders/PurchaseOrdersPage').then(m => ({ default: m.PurchaseOrdersPage })))
const PurchaseOrderFormPage = lazy(() => import('@/pages/purchase-orders/PurchaseOrderFormPage').then(m => ({ default: m.PurchaseOrderFormPage })))
const CustomersPage = lazy(() => import('@/pages/customers/CustomersPage').then(m => ({ default: m.CustomersPage })))
const SuppliersPage = lazy(() => import('@/pages/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })))
const ReturnsPage = lazy(() => import('@/pages/returns/ReturnsPage').then(m => ({ default: m.ReturnsPage })))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const DocumentsPage = lazy(() => import('@/pages/documents/DocumentsPage').then(m => ({ default: m.DocumentsPage })))
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage').then(m => ({ default: m.NotFoundPage })))
const UnauthorizedPage = lazy(() => import('@/pages/errors/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })))

// Page loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner size="lg" />
    </div>
  )
}

function AppContent() {
  // Initialize auth on app load
  useAuth()

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Products */}
          <Route path="products" element={<ProductsPage />} />

          {/* Stock/Inventory */}
          <Route path="stock" element={<StockPage />} />

          {/* Orders */}
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<OrderFormPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="orders/:id/edit" element={<OrderFormPage />} />

          {/* Purchase Orders */}
          <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="purchase-orders/new" element={<PurchaseOrderFormPage />} />
          <Route path="purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />

          {/* Customers */}
          <Route path="customers" element={<CustomersPage />} />

          {/* Suppliers */}
          <Route path="suppliers" element={<SuppliersPage />} />

          {/* Returns */}
          <Route path="returns" element={<ReturnsPage />} />

          {/* Reports */}
          <Route path="reports" element={<ReportsPage />} />

          {/* Documents */}
          <Route path="documents" element={<DocumentsPage />} />

          {/* Settings */}
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Error pages */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  // Theme is applied automatically by the settings store on rehydration
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
