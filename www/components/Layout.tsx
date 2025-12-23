import React from 'react';
import { useApp } from '../contexts/AppContext';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Settings, LogOut, Menu, Users, Receipt, Truck, ClipboardList, Store, Building2 } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Role } from '../types';
import Toast from './Toast';
import Combobox from './Combobox';

const Layout: React.FC = () => {
  const { user, logout, settings, currentOrg, allOrgs, setCurrentOrgId, branches, currentBranch, setCurrentBranchId, toasts, removeToast } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const t = {
    en: { 
      dashboard: 'Dashboard', stock: 'Inventory', pos: 'POS', orders: 'Sales Orders', 
      customers: 'Customers', purchases: 'Purchase Orders', suppliers: 'Suppliers',
      reports: 'Reports', settings: 'Settings', logout: 'Logout' 
    },
    th: { 
      dashboard: 'ภาพรวม', stock: 'คลังสินค้า', pos: 'การขาย', orders: 'รายการขาย', 
      customers: 'ลูกค้า', purchases: 'ใบสั่งซื้อ', suppliers: 'ผู้จัดจำหน่าย',
      reports: 'รายงาน', settings: 'ตั้งค่า', logout: 'ออกจากระบบ' 
    }
  };
  const lang = settings.language;

  const canAccess = (role: Role | undefined, section: string): boolean => {
    if (!role) return false;
    if (role === 'PLATFORM_ADMIN') return true; 
    if (role === 'ORG_ADMIN') return true;
    
    switch (section) {
      case 'dashboard': return true;
      case 'pos': return role === 'STAFF' || role === 'BRANCH_MANAGER';
      case 'inventory': return role === 'BRANCH_MANAGER' || role === 'STAFF';
      case 'orders': return true;
      case 'customers': return true;
      case 'purchases': return role === 'BRANCH_MANAGER';
      case 'suppliers': return role === 'BRANCH_MANAGER';
      case 'reports': return role === 'BRANCH_MANAGER';
      case 'settings': return true;
      default: return false;
    }
  };

  const NavItem = ({ to, icon: Icon, label, show }: { to: string, icon: any, label: string, show: boolean }) => {
    if (!show) return null;
    return (
      <NavLink
        to={to}
        onClick={() => setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? 'bg-primary-500 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`
        }
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </NavLink>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden relative">
      
      {/* Toast Container */}
      <div className="absolute top-4 right-4 z-[60] flex flex-col items-end pointer-events-none">
        {/* Enable pointer events on the toasts themselves so they can be closed */}
        <div className="pointer-events-auto">
          {toasts.map(toast => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>

      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* Org Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
           <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold">SF</div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">StockFlow</span>
           </div>
           
           {/* Platform Admin Org Switcher */}
           {user?.role === 'PLATFORM_ADMIN' && (
             <div className="mb-2">
                <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Organization</label>
                <Combobox 
                   options={allOrgs.map(org => ({ value: org.id, label: org.name }))}
                   value={currentOrg?.id || ''}
                   onChange={setCurrentOrgId}
                />
             </div>
           )}

           {/* Branch Switcher */}
           <div className="relative">
              <Combobox
                 options={branches.map(b => ({ value: b.id, label: b.name }))}
                 value={currentBranch?.id || ''}
                 onChange={setCurrentBranchId}
                 disabled={user?.role === 'STAFF' && !!user.branchId}
                 placeholder="Select Branch"
              />
           </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <NavItem to="/" icon={LayoutDashboard} label={t[lang].dashboard} show={canAccess(user?.role, 'dashboard')} />
          <NavItem to="/pos" icon={ShoppingCart} label={t[lang].pos} show={canAccess(user?.role, 'pos')} />
          <NavItem to="/orders" icon={Receipt} label={t[lang].orders} show={canAccess(user?.role, 'orders')} />
          <NavItem to="/customers" icon={Users} label={t[lang].customers} show={canAccess(user?.role, 'customers')} />
          
          <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
             <p className="px-4 text-xs font-semibold text-gray-400 mb-2 mt-2 uppercase">Stock Management</p>
             <NavItem to="/inventory" icon={Package} label={t[lang].stock} show={canAccess(user?.role, 'inventory')} />
             <NavItem to="/purchase-orders" icon={ClipboardList} label={t[lang].purchases} show={canAccess(user?.role, 'purchases')} />
             <NavItem to="/suppliers" icon={Truck} label={t[lang].suppliers} show={canAccess(user?.role, 'suppliers')} />
          </div>

          <NavItem to="/reports" icon={BarChart3} label={t[lang].reports} show={canAccess(user?.role, 'reports')} />
          
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
             <NavItem to="/settings" icon={Settings} label={t[lang].settings} show={canAccess(user?.role, 'settings')} />
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4 px-2">
             <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-medium">
               {user?.name.charAt(0)}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
               <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.role.replace('_', ' ')}</p>
             </div>
          </div>
          <button onClick={logout} className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <LogOut size={18} />
            <span>{t[lang].logout}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center z-20 shadow-sm">
          <div className="flex items-center gap-2">
             <span className="text-lg font-bold text-primary-600">StockFlow</span>
             <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 truncate max-w-[100px]">{currentBranch?.name}</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 dark:text-gray-300">
             <Menu />
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute inset-0 z-50 bg-gray-800/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
             <div className="absolute right-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl p-4 space-y-2 transform transition-transform overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 px-2">
                   <h2 className="text-lg font-bold dark:text-white">Menu</h2>
                   <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500">✕</button>
                </div>
                {/* Mobile Branch Switcher */}
                <div className="mb-4 px-2">
                    <label className="text-xs text-gray-500 mb-1 block">Current Branch</label>
                    <Combobox
                         options={branches.map(b => ({ value: b.id, label: b.name }))}
                         value={currentBranch?.id || ''}
                         onChange={setCurrentBranchId}
                         disabled={user?.role === 'STAFF' && !!user.branchId}
                    />
                </div>

                <NavItem to="/" icon={LayoutDashboard} label={t[lang].dashboard} show={canAccess(user?.role, 'dashboard')} />
                <NavItem to="/pos" icon={ShoppingCart} label={t[lang].pos} show={canAccess(user?.role, 'pos')} />
                <NavItem to="/orders" icon={Receipt} label={t[lang].orders} show={canAccess(user?.role, 'orders')} />
                <NavItem to="/customers" icon={Users} label={t[lang].customers} show={canAccess(user?.role, 'customers')} />
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
                  <NavItem to="/inventory" icon={Package} label={t[lang].stock} show={canAccess(user?.role, 'inventory')} />
                  <NavItem to="/purchase-orders" icon={ClipboardList} label={t[lang].purchases} show={canAccess(user?.role, 'purchases')} />
                  <NavItem to="/suppliers" icon={Truck} label={t[lang].suppliers} show={canAccess(user?.role, 'suppliers')} />
                </div>
                <NavItem to="/reports" icon={BarChart3} label={t[lang].reports} show={canAccess(user?.role, 'reports')} />
                <NavItem to="/settings" icon={Settings} label={t[lang].settings} show={canAccess(user?.role, 'settings')} />
                
                <button onClick={logout} className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 mt-4 border-t border-gray-100 dark:border-gray-700">
                  <LogOut size={20} /> <span>{t[lang].logout}</span>
                </button>
             </div>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
