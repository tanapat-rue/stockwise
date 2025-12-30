import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  Download,
  Calendar,
  Users,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { DateRangePicker } from '@/components/ui/date-picker'
import { StatCard } from '@/components/ui/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { formatCurrency } from '@/lib/utils'
import { exportToExcel, formatCurrencyForExport } from '@/lib/export'
import {
  useSalesSummary,
  useSalesByProduct,
  useSalesByCustomer,
  useSalesByDate,
  useLowStock,
} from '@/features/reports'
import type { ProductSales, CustomerSales, DateSales, LowStockItem } from '@/features/reports'

// Generate sample data for demo purposes
function generateSampleData(dateParams: { from: string; to: string }) {
  const sampleStats = {
    totalRevenue: 1548500,
    totalCost: 892300,
    totalProfit: 656200,
    orderCount: 127,
    itemsSold: 342,
    avgOrderValue: 12193,
  }

  const sampleProducts: ProductSales[] = [
    { productId: 'p1', productName: 'iPhone 15 Pro Max', sku: 'IPHONE-15PM-256', quantitySold: 24, revenue: 479400, cost: 336000, profit: 143400 },
    { productId: 'p2', productName: 'MacBook Air M3', sku: 'MBA-M3-256', quantitySold: 12, revenue: 395880, cost: 287280, profit: 108600 },
    { productId: 'p3', productName: 'AirPods Pro 2', sku: 'APP2-USB-C', quantitySold: 45, revenue: 337500, cost: 225000, profit: 112500 },
    { productId: 'p4', productName: 'iPad Air 5', sku: 'IPAD-AIR5-256', quantitySold: 18, revenue: 269820, cost: 184680, profit: 85140 },
    { productId: 'p5', productName: 'Apple Watch Ultra 2', sku: 'AW-ULTRA2-49', quantitySold: 8, revenue: 199920, cost: 143920, profit: 56000 },
  ]

  const sampleCustomers: CustomerSales[] = [
    { customerId: 'c1', customerName: 'Tech Solutions Co., Ltd.', phone: '02-123-4567', orderCount: 15, totalSpent: 425000 },
    { customerId: 'c2', customerName: 'Digital World Shop', phone: '02-234-5678', orderCount: 12, totalSpent: 318500 },
    { customerId: 'c3', customerName: 'Smart Office Supply', phone: '02-345-6789', orderCount: 9, totalSpent: 245000 },
    { customerId: 'c4', customerName: 'Mobile Hub Thailand', phone: '02-456-7890', orderCount: 8, totalSpent: 198000 },
    { customerId: 'c5', customerName: 'IT Pro Center', phone: '02-567-8901', orderCount: 6, totalSpent: 156000 },
  ]

  // Generate chart data for the last 14 days
  const chartData: DateSales[] = []
  const endDate = new Date(dateParams.to)
  for (let i = 13; i >= 0; i--) {
    const date = new Date(endDate)
    date.setDate(date.getDate() - i)
    const dayOfWeek = date.getDay()
    // Higher sales on weekdays, lower on weekends
    const baseRevenue = dayOfWeek === 0 || dayOfWeek === 6 ? 35000 : 85000
    const variance = Math.random() * 40000 - 20000
    const revenue = Math.round(baseRevenue + variance)
    chartData.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.max(revenue, 15000),
      orderCount: Math.round(revenue / 12000),
      itemsSold: Math.round(revenue / 4500),
    })
  }

  const sampleLowStock: LowStockItem[] = [
    { productId: 'ls1', productName: 'USB-C Cable 2m', sku: 'USB-C-2M', category: 'Accessories', quantity: 3, cost: 15000, value: 45000 },
    { productId: 'ls2', productName: 'Screen Protector iPhone', sku: 'SP-IPH-15', category: 'Accessories', quantity: 5, cost: 8000, value: 40000 },
    { productId: 'ls3', productName: 'MagSafe Charger', sku: 'MAGSAFE-15W', category: 'Chargers', quantity: 2, cost: 95000, value: 190000 },
    { productId: 'ls4', productName: 'AirTag 4-Pack', sku: 'AIRTAG-4PK', category: 'Accessories', quantity: 0, cost: 299000, value: 0 },
    { productId: 'ls5', productName: 'Magic Keyboard', sku: 'MK-IPAD', category: 'Keyboards', quantity: 4, cost: 899000, value: 3596000 },
  ]

  return { sampleStats, sampleProducts, sampleCustomers, chartData, sampleLowStock }
}

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
  const { t } = useTranslation()
  const [dateRange, setDateRange] = useState('month')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [showSampleData, setShowSampleData] = useState(true)

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
  const { data: topCustomers, isLoading: loadingCustomers } = useSalesByCustomer(dateParams)
  const { data: salesByDate, isLoading: loadingChart } = useSalesByDate(dateParams)
  const { data: lowStockData, isLoading: loadingLowStock } = useLowStock()

  // Generate sample data
  const sampleData = useMemo(() => generateSampleData(dateParams), [dateParams])

  // Check if we have real data
  const hasRealSalesData = salesSummary && (salesSummary.totalRevenue > 0 || salesSummary.orderCount > 0)
  const hasRealProducts = topProducts && topProducts.length > 0
  const hasRealCustomers = topCustomers && topCustomers.length > 0
  const hasRealChartData = salesByDate && salesByDate.some(d => d.revenue > 0)
  const hasRealLowStock = lowStockData?.data && lowStockData.data.length > 0

  // Use sample data if no real data and sample data is enabled
  const stats = hasRealSalesData ? salesSummary : (showSampleData ? sampleData.sampleStats : {
    totalRevenue: 0,
    orderCount: 0,
    itemsSold: 0,
    avgOrderValue: 0,
  })

  const products = hasRealProducts ? topProducts : (showSampleData ? sampleData.sampleProducts : [])
  const customers = hasRealCustomers ? topCustomers : (showSampleData ? sampleData.sampleCustomers : [])
  const chartData = hasRealChartData ? salesByDate : (showSampleData ? sampleData.chartData : [])
  const lowStockItems = hasRealLowStock ? lowStockData.data : (showSampleData ? sampleData.sampleLowStock : [])

  const isUsingSampleData = !hasRealSalesData && !hasRealProducts && !hasRealCustomers && showSampleData

  // Export functions
  const handleExportSalesReport = () => {
    const data = products.map((p) => ({
      'Product Name': p.productName,
      'SKU': p.sku,
      'Quantity Sold': p.quantitySold,
      'Revenue': formatCurrencyForExport(p.revenue),
      'Cost': formatCurrencyForExport(p.cost),
      'Profit': formatCurrencyForExport(p.profit),
    }))
    exportToExcel(data, `sales-report-${dateParams.from}-${dateParams.to}`, 'Sales by Product')
  }

  const handleExportInventoryReport = () => {
    const data = lowStockItems.map((item) => ({
      'Product Name': item.productName,
      'SKU': item.sku,
      'Category': item.category,
      'Current Stock': item.quantity,
      'Unit Cost': formatCurrencyForExport(item.cost),
      'Stock Value': formatCurrencyForExport(item.value),
    }))
    exportToExcel(data, `inventory-report-${new Date().toISOString().split('T')[0]}`, 'Low Stock Items')
  }

  const handleExportCustomerReport = () => {
    const data = customers.map((c) => ({
      'Customer Name': c.customerName,
      'Phone': c.phone || '-',
      'Order Count': c.orderCount,
      'Total Spent': formatCurrencyForExport(c.totalSpent),
    }))
    exportToExcel(data, `customer-report-${dateParams.from}-${dateParams.to}`, 'Top Customers')
  }

  const handleExportDailyReport = () => {
    const data = chartData.map((d) => ({
      'Date': d.date,
      'Revenue': formatCurrencyForExport(d.revenue),
      'Order Count': d.orderCount,
      'Items Sold': d.itemsSold,
    }))
    exportToExcel(data, `daily-sales-${dateParams.from}-${dateParams.to}`, 'Daily Sales')
  }

  const handleExportAll = () => {
    // Export comprehensive report
    const summaryData = [{
      'Period': `${dateParams.from} to ${dateParams.to}`,
      'Total Revenue': formatCurrencyForExport(stats.totalRevenue),
      'Total Orders': stats.orderCount,
      'Items Sold': stats.itemsSold,
      'Average Order Value': formatCurrencyForExport(stats.avgOrderValue),
    }]
    exportToExcel(summaryData, `summary-report-${dateParams.from}-${dateParams.to}`, 'Summary')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('pages.reports.title')}</h1>
          <p className="text-muted-foreground">{t('pages.reports.description')}</p>
        </div>
        <Button variant="outline" onClick={handleExportAll}>
          <Download className="mr-2 h-4 w-4" />
          {t('common.export')}
        </Button>
      </div>

      {/* Sample Data Toggle & Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label>{t('pages.reports.period')}</Label>
              </div>
              <Combobox
                options={[
                  { value: 'today', label: t('pages.reports.today') },
                  { value: 'week', label: t('pages.reports.thisWeek') },
                  { value: 'month', label: t('pages.reports.thisMonth') },
                  { value: 'quarter', label: t('pages.reports.thisQuarter') },
                  { value: 'year', label: t('pages.reports.thisYear') },
                  { value: 'custom', label: t('pages.reports.custom') },
                ]}
                value={dateRange}
                onValueChange={setDateRange}
                placeholder={t('pages.reports.selectPeriod')}
                searchPlaceholder={t('pages.reports.searchPeriod')}
                className="w-40"
              />
              {dateRange === 'custom' && (
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartChange={setStartDate}
                  onEndChange={setEndDate}
                  startPlaceholder={t('pages.reports.startDate')}
                  endPlaceholder={t('pages.reports.endDate')}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="sample-data"
                checked={showSampleData}
                onCheckedChange={setShowSampleData}
              />
              <Label htmlFor="sample-data" className="text-sm text-muted-foreground cursor-pointer">
                Show demo data
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Data Banner */}
      {isUsingSampleData && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Showing demo data. Create orders to see real sales data in reports.
          </p>
        </div>
      )}

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
              title={t('pages.reports.totalRevenue')}
              value={formatCurrency(stats.totalRevenue)}
              icon={<TrendingUp className="h-4 w-4" />}
              description={t('common.thisPeriod')}
            />
            <StatCard
              title={t('pages.reports.totalOrders')}
              value={stats.orderCount}
              icon={<ShoppingCart className="h-4 w-4" />}
              description={t('common.thisPeriod')}
            />
            <StatCard
              title={t('pages.reports.productsSold')}
              value={stats.itemsSold}
              icon={<Package className="h-4 w-4" />}
              description={t('common.totalItems')}
            />
            <StatCard
              title={t('pages.reports.avgOrderValue')}
              value={formatCurrency(stats.avgOrderValue)}
              icon={<BarChart3 className="h-4 w-4" />}
              description={t('common.thisPeriod')}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('pages.reports.topSellingProducts')}</CardTitle>
              <CardDescription>{t('pages.reports.bestPerformers')}</CardDescription>
            </div>
            {products.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleExportSalesReport}>
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            )}
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
                <p>{t('pages.reports.noSalesData')}</p>
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
                      <p className="text-sm text-muted-foreground">{product.quantitySold} {t('pages.reports.sold')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('pages.reports.topCustomers')}</CardTitle>
              <CardDescription>{t('pages.reports.bestCustomers')}</CardDescription>
            </div>
            {customers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleExportCustomerReport}>
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loadingCustomers ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8" />
                <p>{t('pages.reports.noCustomerData')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customers.slice(0, 5).map((customer, index) => (
                  <div
                    key={customer.customerId}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{customer.customerName}</p>
                        <p className="text-sm text-muted-foreground">{customer.phone || '-'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(customer.totalSpent)}</p>
                      <p className="text-sm text-muted-foreground">{customer.orderCount} {t('pages.reports.orders')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('pages.reports.salesTrend')}</CardTitle>
            <CardDescription>{t('pages.reports.revenueOverTime')}</CardDescription>
          </div>
          {chartData.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleExportDailyReport}>
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingChart ? (
            <Skeleton className="h-64" />
          ) : chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="mx-auto h-12 w-12 mb-2" />
                <p>{t('pages.reports.noDataPeriod')}</p>
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
                      className="flex-1 flex flex-col items-center justify-end group"
                    >
                      <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                        {formatCurrency(day.revenue)}
                      </div>
                      <div
                        className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                        style={{ height: `${Math.max(height, 4)}%` }}
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

      {/* Low Stock Alert */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {t('pages.reports.lowStockAlert')}
            </CardTitle>
            <CardDescription>{t('pages.reports.productsNeedRestocking')}</CardDescription>
          </div>
          {lowStockItems.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleExportInventoryReport}>
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
          )}
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
              <p>{t('pages.reports.allWellStocked')}</p>
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
                    {item.quantity === 0 ? t('common.outOfStock') : `${item.quantity} ${t('common.left')}`}
                  </div>
                </div>
              ))}
            </div>
          )}
          {lowStockItems.length > 6 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {t('common.andMore', { count: lowStockItems.length - 6 })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Report Types */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.reports.availableReports')}</CardTitle>
          <CardDescription>{t('pages.reports.downloadReports')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div
              className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={handleExportSalesReport}
            >
              <ShoppingCart className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="font-medium">{t('pages.reports.salesReport')}</p>
              <p className="text-sm text-muted-foreground">{t('pages.reports.salesReportDesc')}</p>
              <Button variant="link" className="mt-2 p-0 h-auto">
                <Download className="mr-1 h-3 w-3" />
                {t('common.download')}
              </Button>
            </div>
            <div
              className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={handleExportInventoryReport}
            >
              <Package className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="font-medium">{t('pages.reports.inventoryReport')}</p>
              <p className="text-sm text-muted-foreground">{t('pages.reports.inventoryReportDesc')}</p>
              <Button variant="link" className="mt-2 p-0 h-auto">
                <Download className="mr-1 h-3 w-3" />
                {t('common.download')}
              </Button>
            </div>
            <div
              className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={handleExportCustomerReport}
            >
              <Users className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="font-medium">{t('pages.reports.customerReport')}</p>
              <p className="text-sm text-muted-foreground">{t('pages.reports.customerReportDesc')}</p>
              <Button variant="link" className="mt-2 p-0 h-auto">
                <Download className="mr-1 h-3 w-3" />
                {t('common.download')}
              </Button>
            </div>
            <div
              className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={handleExportDailyReport}
            >
              <TrendingUp className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="font-medium">{t('pages.reports.purchaseReport')}</p>
              <p className="text-sm text-muted-foreground">{t('pages.reports.purchaseReportDesc')}</p>
              <Button variant="link" className="mt-2 p-0 h-auto">
                <Download className="mr-1 h-3 w-3" />
                {t('common.download')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
