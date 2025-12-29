import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Package,
  ShoppingCart,
  Truck,
  Users,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { useAuthStore } from '@/stores/auth-store'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { organization } = useAuthStore()

  // Mock data - replace with actual API calls
  const stats = {
    totalProducts: 1247,
    totalOrders: 89,
    pendingOrders: 12,
    lowStockItems: 8,
    revenue: 458900,
    revenueChange: 12.5,
    ordersChange: 8.2,
  }

  const recentOrders = [
    { id: 'ORD-001', customer: 'John Doe', total: 2500, status: 'PENDING' },
    { id: 'ORD-002', customer: 'Jane Smith', total: 4800, status: 'CONFIRMED' },
    { id: 'ORD-003', customer: 'Bob Wilson', total: 1200, status: 'SHIPPED' },
  ]

  const lowStockItems = [
    { id: '1', name: 'Widget A', sku: 'WID-001', quantity: 5, reorderPoint: 10 },
    { id: '2', name: 'Gadget B', sku: 'GAD-002', quantity: 3, reorderPoint: 15 },
    { id: '3', name: 'Component C', sku: 'COM-003', quantity: 8, reorderPoint: 20 },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'warning'
      case 'CONFIRMED':
        return 'default'
      case 'SHIPPED':
        return 'success'
      case 'DELIVERED':
        return 'success'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('pages.dashboard.title')}</h1>
        <p className="text-muted-foreground">
          {t('pages.dashboard.welcome', { name: organization?.name || 'StockWise' })}
        </p>
      </div>

      {/* Stats Grid */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            title={t('pages.dashboard.totalProducts')}
            value={stats.totalProducts.toLocaleString()}
            icon={<Package className="h-4 w-4" />}
            description={t('pages.dashboard.activeProducts')}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title={t('pages.dashboard.totalOrders')}
            value={stats.totalOrders}
            icon={<ShoppingCart className="h-4 w-4" />}
            description={
              <span className="flex items-center text-green-600">
                <ArrowUpRight className="mr-1 h-3 w-3" />
                {t('pages.dashboard.fromLastMonth', { change: stats.ordersChange })}
              </span>
            }
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title={t('pages.dashboard.revenue')}
            value={`฿${(stats.revenue / 100).toLocaleString()}`}
            icon={<TrendingUp className="h-4 w-4" />}
            description={
              <span className="flex items-center text-green-600">
                <ArrowUpRight className="mr-1 h-3 w-3" />
                {t('pages.dashboard.fromLastMonth', { change: stats.revenueChange })}
              </span>
            }
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title={t('pages.dashboard.lowStockAlerts')}
            value={stats.lowStockItems}
            icon={<AlertTriangle className="h-4 w-4" />}
            description={t('pages.dashboard.itemsBelowReorder')}
            className={stats.lowStockItems > 0 ? 'border-orange-200 bg-orange-50' : ''}
          />
        </motion.div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('pages.dashboard.recentOrders')}</CardTitle>
              <CardDescription>{t('pages.dashboard.latestOrders')}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/orders">{t('common.viewAll')}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.customer}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      ฿{(order.total / 100).toLocaleString()}
                    </span>
                    <Badge variant={getStatusColor(order.status)}>{t(`status.${order.status.toLowerCase()}`)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                {t('pages.dashboard.lowStockItems')}
              </CardTitle>
              <CardDescription>{t('pages.dashboard.itemsNeedingRestock')}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/stock">{t('common.viewAll')}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-orange-600">{item.quantity} {t('common.left')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('pages.dashboard.reorderAt', { point: item.reorderPoint })}
                    </p>
                  </div>
                </div>
              ))}
              <Button className="w-full" variant="outline">
                <Truck className="mr-2 h-4 w-4" />
                {t('pages.dashboard.createQuickPO')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.dashboard.quickActions')}</CardTitle>
          <CardDescription>{t('pages.dashboard.commonTasks')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col py-4" asChild>
              <Link to="/orders/new">
                <ShoppingCart className="mb-2 h-6 w-6" />
                <span>{t('pages.dashboard.newOrder')}</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" asChild>
              <Link to="/purchase-orders/new">
                <Truck className="mb-2 h-6 w-6" />
                <span>{t('pages.dashboard.newPurchaseOrder')}</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" asChild>
              <Link to="/products">
                <Package className="mb-2 h-6 w-6" />
                <span>{t('pages.dashboard.manageProducts')}</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" asChild>
              <Link to="/customers">
                <Users className="mb-2 h-6 w-6" />
                <span>{t('pages.dashboard.viewCustomers')}</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
