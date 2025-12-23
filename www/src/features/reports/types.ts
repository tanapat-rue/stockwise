// Report Types
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface SalesSummary {
  totalOrders: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  avgOrderValue: number;

  // Comparison
  previousRevenue?: number;
  revenueGrowth?: number;
}

export interface SalesByProduct {
  productId: string;
  productName: string;
  productSku: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface SalesByCategory {
  categoryId: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
  percentage: number;
}

export interface SalesByChannel {
  channel: string;
  orderCount: number;
  revenue: number;
  percentage: number;
}

export interface SalesTrend {
  date: string;
  orders: number;
  revenue: number;
  profit: number;
}

export interface InventoryValue {
  branchId: string;
  branchName: string;
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  totalCost: number;
}

export interface InventoryAging {
  range: string;
  productCount: number;
  totalValue: number;
  percentage: number;
}

export interface LowStockItem {
  productId: string;
  productName: string;
  productSku: string;
  currentStock: number;
  reorderPoint: number;
  avgDailySales: number;
  daysUntilStockout: number;
}

export interface CustomerSummary {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  avgOrdersPerCustomer: number;
  avgCustomerValue: number;
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
}

// Dashboard KPIs
export interface DashboardKPIs {
  sales: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  orders: {
    pending: number;
    processing: number;
    shipped: number;
    completed: number;
  };
  inventory: {
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  customers: {
    total: number;
    newThisMonth: number;
  };
}
