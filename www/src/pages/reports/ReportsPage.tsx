import { useState, useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  Download,
  Calendar,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { DateRangePicker } from '@/components/ui/date-picker'
import { StatCard } from '@/components/ui/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import {
  useSalesSummary,
  useSalesByProduct,
  useSalesByDate,
  useLowStock,
} from '@/features/reports'

function getDateRange(range: string): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().split('T')[0]

  switch (range) {
    case 'today': {
      return { from: to, to }
    }
    case 'week': {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return { from: weekAgo.toISOString().split('T')[0], to }
    }
    case 'month': {
      const monthAgo = new Date(now)
      monthAgo.setDate(monthAgo.getDate() - 30)
      return { from: monthAgo.toISOString().split('T')[0], to }
    }
    case 'quarter': {
      const quarterAgo = new Date(now)
      quarterAgo.setDate(quarterAgo.getDate() - 90)
      return { from: quarterAgo.toISOString().split('T')[0], to }
    }
    case 'year': {
      const yearAgo = new Date(now)
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      return { from: yearAgo.toISOString().split('T')[0], to }
    }
    default:
      return { from: '', to: '' }
  }
}

export function ReportsPage() {
  const [dateRange, setDateRange] = useState('month')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  const dateParams = useMemo(() => {
    if (dateRange === 'custom' && startDate && endDate) {
      return {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      }
    }
    return getDateRange(dateRange)
  }, [dateRange, startDate, endDate])

  const { data: salesSummary, isLoading: loadingSales } = useSalesSummary(dateParams)
  const { data: topProducts, isLoading: loadingProducts } = useSalesByProduct(dateParams)
  const { data: salesByDate, isLoading: loadingChart } = useSalesByDate(dateParams)
  const { data: lowStockData, isLoading: loadingLowStock } = useLowStock()

  const stats = salesSummary || {
    totalRevenue: 0,
    orderCount: 0,
    itemsSold: 0,
    avgOrderValue: 0,
  }

  const products = topProducts || []
  const chartData = salesByDate || []
  const lowStockItems = lowStockData?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analyze your business performance</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label>Period:</Label>
            </div>
            <Combobox
              options={[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'quarter', label: 'This Quarter' },
                { value: 'year', label: 'This Year' },
                { value: 'custom', label: 'Custom' },
              ]}
              value={dateRange}
              onValueChange={setDateRange}
              placeholder="Select period"
              searchPlaceholder="Search period..."
              className="w-40"
            />
            {dateRange === 'custom' && (
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
                startPlaceholder="Start date"
                endPlaceholder="End date"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingSales ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon={<TrendingUp className="h-4 w-4" />}
              description="This period"
            />
            <StatCard
              title="Total Orders"
              value={stats.orderCount}
              icon={<ShoppingCart className="h-4 w-4" />}
              description="This period"
            />
            <StatCard
              title="Products Sold"
              value={stats.itemsSold}
              icon={<Package className="h-4 w-4" />}
              description="Total items"
            />
            <StatCard
              title="Avg Order Value"
              value={formatCurrency(stats.avgOrderValue)}
              icon={<BarChart3 className="h-4 w-4" />}
              description="This period"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performers this period</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Package className="h-8 w-8" />
                <p>No sales data for this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {products.slice(0, 5).map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{product.productName}</p>
                        <p className="text-sm text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(product.revenue)}</p>
                      <p className="text-sm text-muted-foreground">{product.quantitySold} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <Skeleton className="h-64" />
            ) : chartData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="mx-auto h-12 w-12 mb-2" />
                  <p>No data for this period</p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col">
                {/* Simple bar chart */}
                <div className="flex-1 flex items-end gap-1 pb-4">
                  {chartData.slice(-14).map((day) => {
                    const maxRevenue = Math.max(...chartData.slice(-14).map(d => d.revenue), 1)
                    const height = (day.revenue / maxRevenue) * 100
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center justify-end"
                      >
                        <div
                          className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${day.date}: ${formatCurrency(day.revenue)}`}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-1 text-[10px] text-muted-foreground">
                  {chartData.slice(-14).map((day) => (
                    <div key={day.date} className="flex-1 text-center truncate">
                      {new Date(day.date).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Low Stock Alert
          </CardTitle>
          <CardDescription>Products that need restocking</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLowStock ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Package className="h-5 w-5" />
              <p>All products are well stocked</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lowStockItems.slice(0, 6).map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className={`text-sm font-semibold ${item.quantity === 0 ? 'text-destructive' : 'text-yellow-600'}`}>
                    {item.quantity === 0 ? 'Out of stock' : `${item.quantity} left`}
                  </div>
                </div>
              ))}
            </div>
          )}
          {lowStockItems.length > 6 && (
            <p className="mt-3 text-sm text-muted-foreground">
              And {lowStockItems.length - 6} more items with low stock...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Report Types */}
      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
          <CardDescription>Download detailed reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Sales Report', description: 'Order and revenue details', icon: ShoppingCart },
              { title: 'Inventory Report', description: 'Stock levels and movements', icon: Package },
              { title: 'Customer Report', description: 'Customer activity summary', icon: Users },
              { title: 'Purchase Report', description: 'Supplier orders and costs', icon: TrendingUp },
            ].map((report) => (
              <div
                key={report.title}
                className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <report.icon className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="font-medium">{report.title}</p>
                <p className="text-sm text-muted-foreground">{report.description}</p>
                <Button variant="link" className="mt-2 p-0 h-auto">
                  <Download className="mr-1 h-3 w-3" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
