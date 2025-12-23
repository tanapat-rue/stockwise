import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { CategoriesPage } from '@/pages/categories';
import { ProductsPage, ProductFormPage } from '@/pages/products';
import { StockPage, StockMovementsPage } from '@/pages/stock';
import { PurchaseOrdersPage, PurchaseOrderFormPage } from '@/pages/purchase-orders';
import { OrdersPage, QuickAddPage, OrderFormPage, OrderDetailPage } from '@/pages/orders';
import { DocumentsPage } from '@/pages/documents';
import { DashboardPage } from '@/pages/dashboard';
import { ReportsPage } from '@/pages/reports';
import { SettingsPage } from '@/pages/settings';
import { CustomersPage } from '@/pages/customers';
import { SuppliersPage } from '@/pages/suppliers';
import { UsersPage } from '@/pages/users';
import { setUnauthorizedHandler, clearUnauthorizedHandler } from '@/lib/api-client';
import { useAuthStore } from '@/stores/ui-store';

function NotFoundPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
      </div>
    </div>
  );
}

function UnauthorizedPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">403</h1>
        <p className="mt-2 text-muted-foreground">You don't have permission to access this page</p>
      </div>
    </div>
  );
}

// Component that sets up the 401 handler
function AuthHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  useEffect(() => {
    // Set up 401 handler to redirect to login
    setUnauthorizedHandler(() => {
      logout();
      navigate('/login', { replace: true });
    });

    return () => {
      clearUnauthorizedHandler();
    };
  }, [navigate, logout]);

  return <>{children}</>;
}

// Protected Layout wrapper that checks auth before rendering
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthHandler>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected routes - wrapped with ProtectedLayout */}
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Products */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductFormPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />

          <Route path="categories" element={<CategoriesPage />} />

          {/* Stock/Inventory */}
          <Route path="stock" element={<StockPage />} />
          <Route path="stock/movements" element={<StockMovementsPage />} />

          {/* Orders */}
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/quick" element={<QuickAddPage />} />
          <Route path="orders/new" element={<OrderFormPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="orders/:id/edit" element={<OrderFormPage />} />

          {/* Purchase Orders */}
          <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="purchase-orders/new" element={<PurchaseOrderFormPage />} />
          <Route path="purchase-orders/:id" element={<PurchaseOrderFormPage />} />
          <Route path="purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />

          {/* Customers & Suppliers (separate pages) */}
          <Route path="customers" element={<CustomersPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />

          {/* Documents */}
          <Route path="documents" element={<DocumentsPage />} />

          {/* Reports */}
          <Route path="reports" element={<ReportsPage />} />

          {/* Settings */}
          <Route path="settings" element={<SettingsPage />} />

          {/* Users (admin only) */}
          <Route path="users" element={<UsersPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthHandler>
  );
}
