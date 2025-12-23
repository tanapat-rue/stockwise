package reportsmodule

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	"stockflows/server/internal/models"

	"github.com/gin-gonic/gin"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "reports" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/reports")
	g.Use(auth.RequireUser())

	g.GET("/dashboard", m.dashboard)
	g.GET("/sales/summary", m.salesSummary)
	g.GET("/sales/by-product", m.salesByProduct)
	g.GET("/sales/by-customer", m.salesByCustomer)
	g.GET("/sales/by-date", m.salesByDate)
	g.GET("/inventory/value", m.inventoryValue)
	g.GET("/inventory/low-stock", m.lowStock)
	g.GET("/customers/summary", m.customersSummary)
}

// dashboard returns key metrics for the main dashboard
func (m *Module) dashboard(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	ctx := c.Request.Context()

	// Get date range (default: last 30 days)
	endDate := time.Now().UTC()
	startDate := endDate.AddDate(0, 0, -30)
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			startDate = t
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			endDate = t.Add(24*time.Hour - time.Second)
		}
	}

	// Fetch all data in parallel would be ideal, but keeping it simple
	products, _ := m.deps.Repo.ListProductsByOrg(ctx, orgID)
	customers, _ := m.deps.Repo.ListCustomersByOrg(ctx, orgID)
	transactions, _ := m.deps.Repo.ListTransactionsByOrg(ctx, orgID)
	stockLevels, _ := m.deps.Repo.ListStockLevelsByOrg(ctx, orgID)

	// Calculate metrics
	var totalRevenue, totalCost, totalProfit int64
	var orderCount, pendingOrders int
	for _, t := range transactions {
		txnTime, _ := time.Parse(time.RFC3339, t.Date)
		if txnTime.Before(startDate) || txnTime.After(endDate) {
			continue
		}
		if strings.ToUpper(t.Type) == "SALE" && strings.ToUpper(t.Status) != "CANCELLED" && strings.ToUpper(t.Status) != "REFUNDED" {
			totalRevenue += t.Total
			totalCost += t.COGS
			totalProfit += t.Profit
			orderCount++
			if t.FulfillmentStatus == "PENDING" {
				pendingOrders++
			}
		}
	}

	// Calculate total inventory value
	var inventoryValue int64
	productCostMap := make(map[string]int64)
	for _, p := range products {
		productCostMap[p.ID] = p.Cost
	}
	for _, sl := range stockLevels {
		cost := productCostMap[sl.ProductID]
		inventoryValue += int64(sl.Quantity) * cost
	}

	// Calculate low stock count
	lowStockCount := 0
	lowStockThreshold := 10
	for _, sl := range stockLevels {
		if sl.Quantity <= lowStockThreshold && sl.Quantity > 0 {
			lowStockCount++
		}
	}

	// Out of stock count
	outOfStockCount := 0
	for _, sl := range stockLevels {
		if sl.Quantity <= 0 {
			outOfStockCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"totalRevenue":    totalRevenue,
			"totalCost":       totalCost,
			"totalProfit":     totalProfit,
			"orderCount":      orderCount,
			"pendingOrders":   pendingOrders,
			"productCount":    len(products),
			"customerCount":   len(customers),
			"inventoryValue":  inventoryValue,
			"lowStockCount":   lowStockCount,
			"outOfStockCount": outOfStockCount,
			"period": gin.H{
				"from": startDate.Format("2006-01-02"),
				"to":   endDate.Format("2006-01-02"),
			},
		},
	})
}

// salesSummary returns sales totals for a period
func (m *Module) salesSummary(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	ctx := c.Request.Context()

	endDate := time.Now().UTC()
	startDate := endDate.AddDate(0, 0, -30)
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			startDate = t
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			endDate = t.Add(24*time.Hour - time.Second)
		}
	}

	transactions, _ := m.deps.Repo.ListTransactionsByOrg(ctx, orgID)

	var totalRevenue, totalCost, totalProfit int64
	var orderCount, itemsSold int
	for _, t := range transactions {
		txnTime, _ := time.Parse(time.RFC3339, t.Date)
		if txnTime.Before(startDate) || txnTime.After(endDate) {
			continue
		}
		if strings.ToUpper(t.Type) == "SALE" && strings.ToUpper(t.Status) != "CANCELLED" && strings.ToUpper(t.Status) != "REFUNDED" {
			totalRevenue += t.Total
			totalCost += t.COGS
			totalProfit += t.Profit
			orderCount++
			for _, item := range t.Items {
				itemsSold += item.Quantity
			}
		}
	}

	avgOrderValue := int64(0)
	if orderCount > 0 {
		avgOrderValue = totalRevenue / int64(orderCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"totalRevenue":  totalRevenue,
			"totalCost":     totalCost,
			"totalProfit":   totalProfit,
			"orderCount":    orderCount,
			"itemsSold":     itemsSold,
			"avgOrderValue": avgOrderValue,
			"period": gin.H{
				"from": startDate.Format("2006-01-02"),
				"to":   endDate.Format("2006-01-02"),
			},
		},
	})
}

type productSales struct {
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	SKU         string `json:"sku"`
	QuantitySold int   `json:"quantitySold"`
	Revenue     int64  `json:"revenue"`
	Cost        int64  `json:"cost"`
	Profit      int64  `json:"profit"`
}

// salesByProduct returns top selling products
func (m *Module) salesByProduct(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	ctx := c.Request.Context()

	endDate := time.Now().UTC()
	startDate := endDate.AddDate(0, 0, -30)
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			startDate = t
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			endDate = t.Add(24*time.Hour - time.Second)
		}
	}

	transactions, _ := m.deps.Repo.ListTransactionsByOrg(ctx, orgID)

	salesMap := make(map[string]*productSales)
	for _, t := range transactions {
		txnTime, _ := time.Parse(time.RFC3339, t.Date)
		if txnTime.Before(startDate) || txnTime.After(endDate) {
			continue
		}
		if strings.ToUpper(t.Type) != "SALE" || strings.ToUpper(t.Status) == "CANCELLED" || strings.ToUpper(t.Status) == "REFUNDED" {
			continue
		}
		for _, item := range t.Items {
			ps, ok := salesMap[item.ID]
			if !ok {
				ps = &productSales{
					ProductID:   item.ID,
					ProductName: item.Name,
					SKU:         item.SKU,
				}
				salesMap[item.ID] = ps
			}
			ps.QuantitySold += item.Quantity
			ps.Revenue += item.Price * int64(item.Quantity)
			ps.Cost += item.LineCost
			ps.Profit += item.Price*int64(item.Quantity) - item.LineCost
		}
	}

	result := make([]productSales, 0, len(salesMap))
	for _, ps := range salesMap {
		result = append(result, *ps)
	}

	// Sort by revenue descending
	sort.Slice(result, func(i, j int) bool {
		return result[i].Revenue > result[j].Revenue
	})

	// Limit to top 20
	if len(result) > 20 {
		result = result[:20]
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
		"meta": gin.H{
			"period": gin.H{
				"from": startDate.Format("2006-01-02"),
				"to":   endDate.Format("2006-01-02"),
			},
		},
	})
}

type customerSales struct {
	CustomerID   string `json:"customerId"`
	CustomerName string `json:"customerName"`
	Phone        string `json:"phone"`
	OrderCount   int    `json:"orderCount"`
	TotalSpent   int64  `json:"totalSpent"`
}

// salesByCustomer returns top customers by spend
func (m *Module) salesByCustomer(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	ctx := c.Request.Context()

	endDate := time.Now().UTC()
	startDate := endDate.AddDate(0, 0, -30)
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			startDate = t
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			endDate = t.Add(24*time.Hour - time.Second)
		}
	}

	transactions, _ := m.deps.Repo.ListTransactionsByOrg(ctx, orgID)
	customers, _ := m.deps.Repo.ListCustomersByOrg(ctx, orgID)

	customerMap := make(map[string]models.Customer)
	for _, cust := range customers {
		customerMap[cust.ID] = cust
	}

	salesMap := make(map[string]*customerSales)
	for _, t := range transactions {
		txnTime, _ := time.Parse(time.RFC3339, t.Date)
		if txnTime.Before(startDate) || txnTime.After(endDate) {
			continue
		}
		if strings.ToUpper(t.Type) != "SALE" || strings.ToUpper(t.Status) == "CANCELLED" || strings.ToUpper(t.Status) == "REFUNDED" {
			continue
		}
		custID := t.CustomerID
		if custID == "" {
			custID = "_walkin"
		}
		cs, ok := salesMap[custID]
		if !ok {
			name := t.RecipientName
			phone := t.RecipientPhone
			if cust, found := customerMap[custID]; found {
				name = cust.Name
				phone = cust.Phone
			}
			cs = &customerSales{
				CustomerID:   custID,
				CustomerName: name,
				Phone:        phone,
			}
			salesMap[custID] = cs
		}
		cs.OrderCount++
		cs.TotalSpent += t.Total
	}

	result := make([]customerSales, 0, len(salesMap))
	for _, cs := range salesMap {
		result = append(result, *cs)
	}

	// Sort by total spent descending
	sort.Slice(result, func(i, j int) bool {
		return result[i].TotalSpent > result[j].TotalSpent
	})

	// Limit to top 20
	if len(result) > 20 {
		result = result[:20]
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
		"meta": gin.H{
			"period": gin.H{
				"from": startDate.Format("2006-01-02"),
				"to":   endDate.Format("2006-01-02"),
			},
		},
	})
}

type dateSales struct {
	Date       string `json:"date"`
	Revenue    int64  `json:"revenue"`
	OrderCount int    `json:"orderCount"`
	ItemsSold  int    `json:"itemsSold"`
}

// salesByDate returns daily sales for charting
func (m *Module) salesByDate(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	ctx := c.Request.Context()

	endDate := time.Now().UTC()
	startDate := endDate.AddDate(0, 0, -30)
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			startDate = t
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			endDate = t.Add(24*time.Hour - time.Second)
		}
	}

	transactions, _ := m.deps.Repo.ListTransactionsByOrg(ctx, orgID)

	salesMap := make(map[string]*dateSales)
	for _, t := range transactions {
		txnTime, _ := time.Parse(time.RFC3339, t.Date)
		if txnTime.Before(startDate) || txnTime.After(endDate) {
			continue
		}
		if strings.ToUpper(t.Type) != "SALE" || strings.ToUpper(t.Status) == "CANCELLED" || strings.ToUpper(t.Status) == "REFUNDED" {
			continue
		}
		dateKey := txnTime.Format("2006-01-02")
		ds, ok := salesMap[dateKey]
		if !ok {
			ds = &dateSales{Date: dateKey}
			salesMap[dateKey] = ds
		}
		ds.Revenue += t.Total
		ds.OrderCount++
		for _, item := range t.Items {
			ds.ItemsSold += item.Quantity
		}
	}

	// Generate all dates in range
	result := make([]dateSales, 0)
	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		dateKey := d.Format("2006-01-02")
		if ds, ok := salesMap[dateKey]; ok {
			result = append(result, *ds)
		} else {
			result = append(result, dateSales{Date: dateKey})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
		"meta": gin.H{
			"period": gin.H{
				"from": startDate.Format("2006-01-02"),
				"to":   endDate.Format("2006-01-02"),
			},
		},
	})
}

type inventoryItem struct {
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	SKU         string `json:"sku"`
	Category    string `json:"category"`
	Quantity    int    `json:"quantity"`
	Cost        int64  `json:"cost"`
	Value       int64  `json:"value"`
}

type branchInventoryValue struct {
	BranchID      string `json:"branchId"`
	BranchName    string `json:"branchName"`
	TotalProducts int    `json:"totalProducts"`
	TotalQuantity int    `json:"totalQuantity"`
	TotalValue    int64  `json:"totalValue"`
	TotalCost     int64  `json:"totalCost"`
}

// inventoryValue returns total inventory value grouped by branch
func (m *Module) inventoryValue(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	ctx := c.Request.Context()

	products, _ := m.deps.Repo.ListProductsByOrg(ctx, orgID)
	stockLevels, _ := m.deps.Repo.ListStockLevelsByOrg(ctx, orgID)
	branches, _ := m.deps.Repo.ListBranchesByOrg(ctx, orgID)

	productMap := make(map[string]models.Product)
	for _, p := range products {
		productMap[p.ID] = p
	}

	branchMap := make(map[string]models.Branch)
	for _, b := range branches {
		branchMap[b.ID] = b
	}

	// Group by branch
	branchStats := make(map[string]*branchInventoryValue)
	for _, sl := range stockLevels {
		p, ok := productMap[sl.ProductID]
		if !ok {
			continue
		}

		branchID := sl.BranchID
		if branchID == "" {
			branchID = "default"
		}

		bs, exists := branchStats[branchID]
		if !exists {
			branchName := "Main Branch"
			if b, ok := branchMap[branchID]; ok {
				branchName = b.Name
			}
			bs = &branchInventoryValue{
				BranchID:   branchID,
				BranchName: branchName,
			}
			branchStats[branchID] = bs
		}

		value := int64(sl.Quantity) * p.Cost
		bs.TotalProducts++
		bs.TotalQuantity += sl.Quantity
		bs.TotalValue += value
		bs.TotalCost += p.Cost
	}

	result := make([]branchInventoryValue, 0, len(branchStats))
	for _, bs := range branchStats {
		result = append(result, *bs)
	}

	// Sort by value descending
	sort.Slice(result, func(i, j int) bool {
		return result[i].TotalValue > result[j].TotalValue
	})

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

// lowStock returns products with low stock
func (m *Module) lowStock(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	ctx := c.Request.Context()

	products, _ := m.deps.Repo.ListProductsByOrg(ctx, orgID)
	stockLevels, _ := m.deps.Repo.ListStockLevelsByOrg(ctx, orgID)

	productMap := make(map[string]models.Product)
	for _, p := range products {
		productMap[p.ID] = p
	}

	threshold := 10
	items := make([]inventoryItem, 0)
	for _, sl := range stockLevels {
		if sl.Quantity > threshold {
			continue
		}
		p, ok := productMap[sl.ProductID]
		if !ok {
			continue
		}
		items = append(items, inventoryItem{
			ProductID:   p.ID,
			ProductName: p.Name,
			SKU:         p.SKU,
			Category:    p.Category,
			Quantity:    sl.Quantity,
			Cost:        p.Cost,
			Value:       int64(sl.Quantity) * p.Cost,
		})
	}

	// Sort by quantity ascending (lowest first)
	sort.Slice(items, func(i, j int) bool {
		return items[i].Quantity < items[j].Quantity
	})

	c.JSON(http.StatusOK, gin.H{
		"data": items,
		"meta": gin.H{
			"threshold": threshold,
			"total":     len(items),
		},
	})
}

// customersSummary returns customer statistics
func (m *Module) customersSummary(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	ctx := c.Request.Context()

	customers, _ := m.deps.Repo.ListCustomersByOrg(ctx, orgID)
	transactions, _ := m.deps.Repo.ListTransactionsByOrg(ctx, orgID)

	// Count customers with orders
	customerOrders := make(map[string]int)
	for _, t := range transactions {
		if strings.ToUpper(t.Type) == "SALE" && t.CustomerID != "" {
			customerOrders[t.CustomerID]++
		}
	}

	activeCustomers := 0
	var totalPoints int
	var totalSpent int64
	for _, cust := range customers {
		totalPoints += cust.Points
		totalSpent += cust.TotalSpent
		if customerOrders[cust.ID] > 0 {
			activeCustomers++
		}
	}

	avgSpent := int64(0)
	if len(customers) > 0 {
		avgSpent = totalSpent / int64(len(customers))
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"totalCustomers":  len(customers),
			"activeCustomers": activeCustomers,
			"totalPoints":     totalPoints,
			"totalSpent":      totalSpent,
			"avgSpent":        avgSpent,
		},
	})
}
