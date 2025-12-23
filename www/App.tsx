import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const AppRoutes = () => {
  const { user } = useApp();

  if (!user) {
    return <Login />;
  }

  // Helper to check permissions
  const isStaffOrHigher = ['PLATFORM_ADMIN', 'ORG_ADMIN', 'BRANCH_MANAGER', 'STAFF'].includes(user.role);
  const isManagerOrHigher = ['PLATFORM_ADMIN', 'ORG_ADMIN', 'BRANCH_MANAGER'].includes(user.role);
  const isAdmin = ['PLATFORM_ADMIN', 'ORG_ADMIN'].includes(user.role);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        
        {/* POS: Accessible to all authenticated users with roles */}
        <Route path="pos" element={
          isStaffOrHigher ? <POS /> : <Navigate to="/" />
        } />
        
        {/* Inventory: All roles (POS User is Read-Only handled in page) */}
        <Route path="inventory" element={<Inventory />} />

        {/* Orders & Customers: Accessible to all authenticated users for now */}
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        
        {/* Purchasing: Manager or Admin */}
        <Route path="suppliers" element={
          isManagerOrHigher ? <Suppliers /> : <Navigate to="/" />
        } />
        <Route path="purchase-orders" element={
          isManagerOrHigher ? <PurchaseOrders /> : <Navigate to="/" />
        } />

        {/* Reports: Manager or Admin */}
        <Route path="reports" element={
          isManagerOrHigher ? <Reports /> : <Navigate to="/" />
        } />
        
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
};

export default App;