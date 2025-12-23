import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Clock,
  Truck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardKPIs } from '@/features/reports';
import { formatCurrency } from '@/lib/utils';

export function DashboardPage() {
  const { data: kpis, isLoading } = useDashboardKPIs();

  // Transform API response to the format expected by the UI
  // API returns: totalRevenue, orderCount, pendingOrders, customerCount, inventoryValue, lowStockCount, outOfStockCount
  const data = {
    sales: {
      today: kpis?.totalRevenue || 0,
      thisWeek: kpis?.totalRevenue || 0,
      thisMonth: kpis?.totalRevenue || 0,
      growth: 0,
    },
    orders: {
      pending: kpis?.pendingOrders || 0,
      processing: 0,
      shipped: 0,
      completed: Math.max(0, (kpis?.orderCount || 0) - (kpis?.pendingOrders || 0)),
    },
    inventory: {
      totalValue: kpis?.inventoryValue || 0,
      lowStockCount: kpis?.lowStockCount || 0,
      outOfStockCount: kpis?.outOfStockCount || 0,
    },
    customers: {
      total: kpis?.customerCount || 0,
      newThisMonth: 0,
    },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening with your store.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.sales.today)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {data.sales.growth >= 0 ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{data.sales.growth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  <span className="text-red-500">{data.sales.growth}%</span>
                </>
              )}
              <span className="ml-1">from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.orders.pending + data.orders.processing + data.orders.shipped}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{data.orders.pending} pending</span>
              <span>•</span>
              <span>{data.orders.shipped} shipped</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.inventory.totalValue)}</div>
            <div className="flex items-center gap-2 text-xs">
              {data.inventory.lowStockCount > 0 && (
                <Badge variant="warning" className="text-xs">
                  {data.inventory.lowStockCount} low stock
                </Badge>
              )}
              {data.inventory.outOfStockCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {data.inventory.outOfStockCount} out
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.customers.total}</div>
            <p className="text-xs text-muted-foreground">
              +{data.customers.newThisMonth} new this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <CardDescription>Current order pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span>Pending Confirmation</span>
              </div>
              <Badge variant="secondary">{data.orders.pending}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <span>Processing</span>
              </div>
              <Badge variant="secondary">{data.orders.processing}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-purple-500" />
                <span>Shipped</span>
              </div>
              <Badge variant="secondary">{data.orders.shipped}</Badge>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/orders">
                View All Orders
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Alerts</CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.inventory.outOfStockCount > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium">Out of Stock</span>
                </div>
                <Badge variant="destructive">{data.inventory.outOfStockCount}</Badge>
              </div>
            )}
            {data.inventory.lowStockCount > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">Low Stock</span>
                </div>
                <Badge variant="warning">{data.inventory.lowStockCount}</Badge>
              </div>
            )}
            {data.inventory.outOfStockCount === 0 && data.inventory.lowStockCount === 0 && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <span>All stock levels are healthy</span>
              </div>
            )}
            <Button variant="outline" className="w-full" asChild>
              <Link to="/stock">
                Manage Inventory
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sales Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Summary</CardTitle>
          <CardDescription>Revenue overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-bold">{formatCurrency(data.sales.today)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold">{formatCurrency(data.sales.thisWeek)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">{formatCurrency(data.sales.thisMonth)}</p>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" asChild>
              <Link to="/reports">
                View Detailed Reports
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
