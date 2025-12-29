import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  Users,
  Truck,
  BarChart3,
  Settings,
  ChevronLeft,
  Boxes,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'

const navigation = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'products', href: '/products', icon: Package },
  { key: 'stock', href: '/stock', icon: Boxes },
  { key: 'orders', href: '/orders', icon: ShoppingCart },
  { key: 'purchaseOrders', href: '/purchase-orders', icon: ClipboardList },
  { key: 'customers', href: '/customers', icon: Users },
  { key: 'suppliers', href: '/suppliers', icon: Truck },
  { key: 'returns', href: '/returns', icon: RotateCcw },
  { key: 'reports', href: '/reports', icon: BarChart3 },
  { key: 'settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { organization } = useAuthStore()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!sidebarCollapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package className="h-5 w-5" />
            </div>
            <span className="font-semibold">StockWise</span>
          </Link>
        )}
        {sidebarCollapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground mx-auto">
            <Package className="h-5 w-5" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn('h-8 w-8', sidebarCollapsed && 'absolute -right-3 top-6 z-50 rounded-full border bg-background shadow-md')}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* Organization */}
      {organization && !sidebarCollapsed && (
        <div className="border-b px-4 py-3">
          <p className="text-xs text-muted-foreground">{t('navigation.organization')}</p>
          <p className="truncate text-sm font-medium">{organization.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
          const name = t(`navigation.${item.key}`)
          return (
            <Link
              key={item.key}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5',
                sidebarCollapsed && 'justify-center px-2'
              )}
              title={sidebarCollapsed ? name : undefined}
            >
              <item.icon className={cn('h-5 w-5 shrink-0 transition-transform duration-200', !isActive && 'group-hover:scale-110')} />
              {!sidebarCollapsed && <span>{name}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
