import { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  Download,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { formatCurrency } from '@/lib/utils'

export function ReportsPage() {
  const [dateRange, setDateRange] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Mock data - replace with actual API calls
  const stats = {
    totalRevenue: 4589000,
    totalOrders: 156,
    totalProducts: 1247,
    averageOrderValue: 29417,
  }

  const topProducts = [
    { name: 'Widget A', sku: 'WID-001', sold: 245, revenue: 612500 },
    { name: 'Gadget B', sku: 'GAD-002', sold: 189, revenue: 567000 },
    { name: 'Component C', sku: 'COM-003', sold: 156, revenue: 390000 },
    { name: 'Device D', sku: 'DEV-004', sold: 134, revenue: 335000 },
    { name: 'Part E', sku: 'PAR-005', sold: 98, revenue: 245000 },
  ]

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
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {dateRange === 'custom' && (
              <>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <span>to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<TrendingUp className="h-4 w-4" />}
          description="This period"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={<ShoppingCart className="h-4 w-4" />}
          description="This period"
        />
        <StatCard
          title="Products Sold"
          value={stats.totalProducts}
          icon={<Package className="h-4 w-4" />}
          description="Unique items"
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(stats.averageOrderValue)}
          icon={<BarChart3 className="h-4 w-4" />}
          description="This period"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performers this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div
                  key={product.sku}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(product.revenue)}</p>
                    <p className="text-sm text-muted-foreground">{product.sold} sold</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="mx-auto h-12 w-12 mb-2" />
                <p>Chart visualization</p>
                <p className="text-sm">Coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Types */}
      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
          <CardDescription>Download detailed reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Sales Report', description: 'Order and revenue details' },
              { title: 'Inventory Report', description: 'Stock levels and movements' },
              { title: 'Customer Report', description: 'Customer activity summary' },
              { title: 'Purchase Report', description: 'Supplier orders and costs' },
            ].map((report) => (
              <div
                key={report.title}
                className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              >
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
