export interface DashboardData {
  totalRevenue: number
  totalCost: number
  totalProfit: number
  orderCount: number
  pendingOrders: number
  productCount: number
  customerCount: number
  inventoryValue: number
  lowStockCount: number
  outOfStockCount: number
  period: {
    from: string
    to: string
  }
}

export interface SalesSummary {
  totalRevenue: number
  totalCost: number
  totalProfit: number
  orderCount: number
  itemsSold: number
  avgOrderValue: number
  period: {
    from: string
    to: string
  }
}

export interface ProductSales {
  productId: string
  productName: string
  sku: string
  quantitySold: number
  revenue: number
  cost: number
  profit: number
}

export interface CustomerSales {
  customerId: string
  customerName: string
  phone: string
  orderCount: number
  totalSpent: number
}

export interface DateSales {
  date: string
  revenue: number
  orderCount: number
  itemsSold: number
}

export interface BranchInventoryValue {
  branchId: string
  branchName: string
  totalProducts: number
  totalQuantity: number
  totalValue: number
  totalCost: number
}

export interface LowStockItem {
  productId: string
  productName: string
  sku: string
  category: string
  quantity: number
  cost: number
  value: number
}

export interface CustomersSummary {
  totalCustomers: number
  activeCustomers: number
  totalPoints: number
  totalSpent: number
  avgSpent: number
}

export interface ReportDateParams {
  from?: string
  to?: string
}
