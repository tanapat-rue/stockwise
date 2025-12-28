package ordersmodule

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	"stockflows/server/internal/models"
	"stockflows/server/internal/repo"
	"stockflows/server/internal/services/costing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"github.com/gin-gonic/gin"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "orders" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/transactions", auth.RequireUser(), m.listTransactions)
	r.POST("/checkout", auth.RequireUser(), m.checkout)

	orders := r.Group("/orders")
	orders.Use(auth.RequireUser())
	orders.GET("", m.listOrders)
	orders.POST("", m.createOrder)
	orders.GET("/stats", m.stats)
	orders.GET("/next-number", m.nextNumber)
	orders.POST("/quick", m.quickAdd)
	orders.GET("/:id", m.getOrder)
	orders.PATCH("/:id", m.updateOrder)
	orders.DELETE("/:id", m.deleteOrder)
	orders.PATCH("/:id/fulfillment", m.updateFulfillment)
	orders.POST("/bulk-status", m.bulkStatus)
	orders.POST("/:id/cancel", m.cancel)
	orders.POST("/:id/confirm", m.confirm)
	orders.POST("/:id/complete", m.complete)
	orders.POST("/:id/payment", m.recordPayment)
	orders.POST("/:id/ship", m.markShipped)
	orders.POST("/:id/deliver", m.markDelivered)
	orders.GET("/:id/timeline", m.getTimeline)
}

// OrderResponse is the frontend-expected format for orders
type OrderResponse struct {
	ID                string                 `json:"id"`
	OrgID             string                 `json:"orgId"`
	BranchID          string                 `json:"branchId"`
	BranchName        string                 `json:"branchName"`
	OrderNumber       string                 `json:"orderNumber"`
	Channel           string                 `json:"channel"`
	OrderDate         string                 `json:"orderDate"`
	CustomerID        string                 `json:"customerId,omitempty"`
	CustomerName      string                 `json:"customerName"`
	CustomerPhone     string                 `json:"customerPhone,omitempty"`
	CustomerEmail     string                 `json:"customerEmail,omitempty"`
	Status            string                 `json:"status"`
	FulfillmentStatus string                 `json:"fulfillmentStatus"`
	PaymentStatus     string                 `json:"paymentStatus"`
	Items             []OrderItemResponse    `json:"items"`
	Subtotal          int64                  `json:"subtotal"`
	DiscountAmount    int64                  `json:"discountAmount"`
	TaxRate           float64                `json:"taxRate"`
	TaxAmount         int64                  `json:"taxAmount"`
	ShippingCost      int64                  `json:"shippingCost"`
	TotalAmount       int64                  `json:"totalAmount"`
	PaidAmount        int64                  `json:"paidAmount"`
	DueAmount         int64                  `json:"dueAmount"`
	TotalCost         int64                  `json:"totalCost"`
	GrossProfit       int64                  `json:"grossProfit"`
	Shipping          *models.ShippingInfo   `json:"shipping,omitempty"`
	Recipient         *RecipientResponse     `json:"recipient,omitempty"`
	CustomerNote      string                 `json:"customerNote,omitempty"`
	InternalNote      string                 `json:"internalNote,omitempty"`
	CreatedAt         string                 `json:"createdAt"`
	UpdatedAt         string                 `json:"updatedAt"`
}

// RecipientResponse is shipping recipient info for orders
type RecipientResponse struct {
	Name       string `json:"name,omitempty"`
	Phone      string `json:"phone,omitempty"`
	Address    string `json:"address,omitempty"`
	City       string `json:"city,omitempty"`
	Province   string `json:"province,omitempty"`
	PostalCode string `json:"postalCode,omitempty"`
}

type OrderItemResponse struct {
	ID          string `json:"id"`
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	ProductSku  string `json:"productSku"`
	Unit        string `json:"unit"`
	Quantity    int    `json:"quantity"`
	UnitPrice   int64  `json:"unitPrice"`
	Discount    int64  `json:"discount"`
	LineTotal   int64  `json:"lineTotal"`
	UnitCost    int64  `json:"unitCost"`
	LineCost    int64  `json:"lineCost"`
}

func (m *Module) transactionToOrder(txn models.Transaction, branchName string) OrderResponse {
	items := make([]OrderItemResponse, 0, len(txn.Items))
	var subtotal int64
	for i, it := range txn.Items {
		lineTotal := it.Price * int64(it.Quantity)
		subtotal += lineTotal
		items = append(items, OrderItemResponse{
			ID:          it.ID + "-" + string(rune(i)),
			ProductID:   it.ID,
			ProductName: it.Name,
			ProductSku:  it.SKU,
			Unit:        "pcs",
			Quantity:    it.Quantity,
			UnitPrice:   it.Price,
			Discount:    0,
			LineTotal:   lineTotal,
			UnitCost:    it.Cost,
			LineCost:    it.LineCost,
		})
	}

	paymentStatus := "UNPAID"
	paidAmount := int64(0)
	if txn.Status == "COMPLETED" {
		paymentStatus = "PAID"
		paidAmount = txn.Total
	} else if txn.Status == "REFUNDED" {
		paymentStatus = "REFUNDED"
	}
	dueAmount := txn.Total - paidAmount

	// Build recipient from transaction data
	var recipient *RecipientResponse
	if txn.RecipientName != "" || txn.RecipientPhone != "" || txn.RecipientAddress != "" {
		recipient = &RecipientResponse{
			Name:    txn.RecipientName,
			Phone:   txn.RecipientPhone,
			Address: txn.RecipientAddress,
		}
	}

	return OrderResponse{
		ID:                txn.ID,
		OrgID:             txn.OrgID,
		BranchID:          txn.BranchID,
		BranchName:        branchName,
		OrderNumber:       txn.ID,
		Channel:           txn.Channel,
		OrderDate:         txn.Date,
		CustomerID:        txn.CustomerID,
		CustomerName:      txn.RecipientName,
		CustomerPhone:     txn.RecipientPhone,
		CustomerEmail:     "", // Not stored in transaction currently
		Status:            txn.Status,
		FulfillmentStatus: txn.FulfillmentStatus,
		PaymentStatus:     paymentStatus,
		Items:             items,
		Subtotal:          subtotal,
		DiscountAmount:    0,
		TaxRate:           0, // Default tax rate
		TaxAmount:         0,
		ShippingCost:      0,
		TotalAmount:       txn.Total,
		PaidAmount:        paidAmount,
		DueAmount:         dueAmount,
		TotalCost:         txn.COGS,
		GrossProfit:       txn.Profit,
		Shipping:          txn.ShippingInfo,
		Recipient:         recipient,
		CustomerNote:      "", // Not stored in transaction currently
		InternalNote:      txn.Note,
		CreatedAt:         txn.CreatedAt.Format(time.RFC3339),
		UpdatedAt:         txn.UpdatedAt.Format(time.RFC3339),
	}
}

func (m *Module) listOrders(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	txns, err := m.deps.Repo.ListTransactionsByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list orders"})
		return
	}

	// Get branches for names
	branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	branchNames := make(map[string]string)
	for _, b := range branches {
		branchNames[b.ID] = b.Name
	}

	// Filter to SALE type only and apply search/status filters
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))
	statusFilter := strings.ToUpper(strings.TrimSpace(c.Query("status")))

	filtered := make([]models.Transaction, 0, len(txns))
	for _, t := range txns {
		if strings.ToUpper(t.Type) != "SALE" {
			continue
		}
		if statusFilter != "" && strings.ToUpper(t.Status) != statusFilter {
			continue
		}
		if search != "" {
			if !strings.Contains(strings.ToLower(t.ID), search) &&
				!strings.Contains(strings.ToLower(t.RecipientName), search) &&
				!strings.Contains(strings.ToLower(t.RecipientPhone), search) {
				continue
			}
		}
		filtered = append(filtered, t)
	}

	// Convert to Order format
	orders := make([]OrderResponse, 0, len(filtered))
	for _, t := range filtered {
		orders = append(orders, m.transactionToOrder(t, branchNames[t.BranchID]))
	}

	c.JSON(http.StatusOK, gin.H{
		"data": orders,
		"meta": gin.H{
			"page":       0,
			"limit":      len(orders),
			"total":      len(orders),
			"totalPages": 1,
		},
	})
}

func (m *Module) getOrder(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	branchName := ""
	for _, b := range branches {
		if b.ID == txn.BranchID {
			branchName = b.Name
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": m.transactionToOrder(txn, branchName)})
}

func (m *Module) deleteOrder(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	// Only allow deleting draft/pending orders
	if txn.Status != "PENDING" && txn.Status != "DRAFT" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only delete pending or draft orders"})
		return
	}

	// Release any reserved stock
	for _, item := range txn.Items {
		_, _ = m.deps.Repo.ReleaseReservedStock(c.Request.Context(), orgID, txn.BranchID, item.ID, item.Quantity)
	}

	err = m.deps.Repo.DeleteTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": nil})
}

func (m *Module) stats(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	txns, err := m.deps.Repo.ListTransactionsByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get order stats"})
		return
	}

	// Count orders by fulfillment status (only SALE type)
	var pending, processing, shipped, delivered, cancelled int
	var totalRevenue, totalProfit int64
	var pendingShipment int
	for _, t := range txns {
		if strings.ToUpper(t.Type) != "SALE" {
			continue
		}
		status := strings.ToUpper(t.FulfillmentStatus)
		switch status {
		case "PENDING":
			pending++
			pendingShipment++
		case "PROCESSING":
			processing++
			pendingShipment++
		case "SHIPPED":
			shipped++
		case "DELIVERED":
			delivered++
		case "CANCELLED", "RETURNED":
			cancelled++
		}
		if strings.ToUpper(t.Status) != "CANCELLED" && strings.ToUpper(t.Status) != "REFUNDED" {
			totalRevenue += t.Total
			totalProfit += t.Profit
		}
	}

	totalOrders := pending + processing + shipped + delivered
	var avgOrderValue int64
	if totalOrders > 0 {
		avgOrderValue = totalRevenue / int64(totalOrders)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"pending":         pending,
			"processing":      processing,
			"shipped":         shipped,
			"delivered":       delivered,
			"cancelled":       cancelled,
			"totalOrders":     totalOrders,
			"totalRevenue":    totalRevenue,
			"totalProfit":     totalProfit,
			"avgOrderValue":   avgOrderValue,
			"pendingCount":    pending,
			"pendingShipment": pendingShipment,
		},
	})
}

func (m *Module) listTransactions(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	txns, err := m.deps.Repo.ListTransactionsByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list transactions"})
		return
	}

	filterType := strings.TrimSpace(c.Query("type"))
	result := txns
	if filterType != "" {
		filterType = strings.ToUpper(filterType)
		filtered := make([]models.Transaction, 0, len(txns))
		for _, t := range txns {
			if strings.ToUpper(t.Type) == filterType {
				filtered = append(filtered, t)
			}
		}
		result = filtered
	}
	c.JSON(http.StatusOK, gin.H{
		"data": result,
		"meta": gin.H{
			"page":       0,
			"limit":      len(result),
			"total":      len(result),
			"totalPages": 1,
		},
	})
}

type checkoutItem struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

type checkoutRequest struct {
	Items         []checkoutItem `json:"items"`
	CustomerID    string         `json:"customerId"`
	PaymentMethod string         `json:"paymentMethod"` // CASH|QR|CARD|...
	Note          string         `json:"note"`
	AutoDeliver   bool           `json:"autoDeliver"`
}

func (m *Module) checkout(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	branchID := auth.GetBranchIDForRequest(c, u)
	if orgID == "" || branchID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org and branch context required"})
		return
	}

	var req checkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "items are required"})
		return
	}

	// Load products and compute totals.
	items := make([]models.TransactionItem, 0, len(req.Items))
	var total int64
	for _, it := range req.Items {
		if it.Quantity <= 0 || strings.TrimSpace(it.ProductID) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid items"})
			return
		}
		p, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, strings.TrimSpace(it.ProductID))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid productId"})
			return
		}
		items = append(items, models.TransactionItem{
			ID:       p.ID,
			SKU:      p.SKU,
			Name:     p.Name,
			Category: p.Category,
			Image:    p.Image,
			Price:    p.Price,
			Cost:     0,
			LineCost: 0,
			Quantity: it.Quantity,
		})
		total += p.Price * int64(it.Quantity)
	}

	recipientName := "Walk-in Customer"
	var recipientPhone string
	customerID := strings.TrimSpace(req.CustomerID)
	if customerID != "" {
		cust, err := m.deps.Repo.GetCustomerByOrg(c.Request.Context(), orgID, customerID)
		if err == nil {
			recipientName = cust.Name
			recipientPhone = cust.Phone
		}
	}

	orderID := "ORD-" + primitive.NewObjectID().Hex()[18:]
	now := time.Now().UTC().Format(time.RFC3339)
	txn := models.Transaction{
		ID:                orderID,
		OrgID:             orgID,
		BranchID:          branchID,
		Date:              now,
		Channel:           "POS",
		Type:              "SALE",
		Status:            "COMPLETED",
		FulfillmentStatus: "PENDING",
		Items:             items,
		Total:             total,
		UserID:            u.ID,
		CustomerID:        customerID,
		RecipientName:     recipientName,
		RecipientPhone:    recipientPhone,
		PaymentMethod:     strings.TrimSpace(req.PaymentMethod),
		Note:              strings.TrimSpace(req.Note),
		StockCommitted:    false,
		StockCommitInProgress: false,
	}

	// Reserve stock (do not decrement physical until DELIVERED).
	reserved := make([]models.TransactionItem, 0, len(items))
	for _, it := range items {
		_, _ = m.deps.Repo.AdjustStock(c.Request.Context(), orgID, branchID, it.ID, 0)
		_, err := m.deps.Repo.ReserveStock(c.Request.Context(), orgID, branchID, it.ID, it.Quantity)
		if err != nil {
			// rollback reservations best-effort
			for _, done := range reserved {
				_, _ = m.deps.Repo.ReleaseReservedStock(c.Request.Context(), orgID, branchID, done.ID, done.Quantity)
			}
			if errors.Is(err, repo.ErrInsufficientStock) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient stock", "productId": it.ID})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reserve stock"})
			return
		}
		reserved = append(reserved, it)
	}

	created, err := m.deps.Repo.CreateTransaction(c.Request.Context(), txn)
	if err != nil {
		for _, done := range reserved {
			_, _ = m.deps.Repo.ReleaseReservedStock(c.Request.Context(), orgID, branchID, done.ID, done.Quantity)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create transaction"})
		return
	}

	if req.AutoDeliver {
		updated, err := m.commitSaleDelivered(c, orgID, created, "", "")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": updated})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": created})
}

type updateFulfillmentRequest struct {
	Status       string `json:"status"`
	Carrier      string `json:"carrier"`
	TrackingNumber string `json:"trackingNumber"`
}

func (m *Module) updateFulfillment(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	var req updateFulfillmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	status := strings.ToUpper(strings.TrimSpace(req.Status))
	if status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status is required"})
		return
	}

	txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	if status == "DELIVERED" && strings.ToUpper(txn.Type) == "SALE" {
		updated, err := m.commitSaleDelivered(c, orgID, txn, req.Carrier, req.TrackingNumber)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": updated})
		return
	}

	patch := bson.M{"fulfillmentStatus": status}

	if req.Carrier != "" || req.TrackingNumber != "" || txn.ShippingInfo != nil {
		shipping := txn.ShippingInfo
		if shipping == nil {
			shipping = &models.ShippingInfo{}
		}
		if strings.TrimSpace(req.Carrier) != "" {
			shipping.Carrier = strings.TrimSpace(req.Carrier)
		}
		if strings.TrimSpace(req.TrackingNumber) != "" {
			shipping.TrackingNumber = strings.TrimSpace(req.TrackingNumber)
		}
		if status == "SHIPPED" {
			shipping.ShippedDate = time.Now().UTC().Format(time.RFC3339)
		}
		if status == "DELIVERED" {
			shipping.DeliveredDate = time.Now().UTC().Format(time.RFC3339)
		}
		patch["shippingInfo"] = shipping
	}

	updated, err := m.deps.Repo.UpdateTransactionByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update order"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (m *Module) commitSaleDelivered(c *gin.Context, orgID string, txn models.Transaction, carrier, trackingNumber string) (models.Transaction, error) {
	// Idempotency: if already committed, just update fulfillment status + shipping info.
	if txn.StockCommitted {
		patch := bson.M{"fulfillmentStatus": "DELIVERED"}
		if carrier != "" || trackingNumber != "" || txn.ShippingInfo != nil {
			shipping := txn.ShippingInfo
			if shipping == nil {
				shipping = &models.ShippingInfo{}
			}
			if strings.TrimSpace(carrier) != "" {
				shipping.Carrier = strings.TrimSpace(carrier)
			}
			if strings.TrimSpace(trackingNumber) != "" {
				shipping.TrackingNumber = strings.TrimSpace(trackingNumber)
			}
			shipping.DeliveredDate = time.Now().UTC().Format(time.RFC3339)
			patch["shippingInfo"] = shipping
		}
		return m.deps.Repo.UpdateTransactionByOrg(c.Request.Context(), orgID, txn.ID, patch)
	}

	locked, err := m.deps.Repo.LockTransactionForStockCommit(c.Request.Context(), orgID, txn.ID)
	if err != nil {
		if errors.Is(err, repo.ErrConflict) {
			current, getErr := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, txn.ID)
			if getErr == nil && current.StockCommitted {
				return current, nil
			}
			return models.Transaction{}, repo.ErrConflict
		}
		return models.Transaction{}, err
	}
	txn = locked

	type committedItem struct {
		productID string
		qty       int
	}
	committed := make([]committedItem, 0, len(txn.Items))
	rollbackStock := func() {
		for _, it := range committed {
			_ = m.deps.Repo.UncommitReservedStock(c.Request.Context(), orgID, txn.BranchID, it.productID, it.qty)
		}
	}

	// Commit physical stock (decrement quantity and reserved).
	for _, it := range txn.Items {
		if it.Quantity <= 0 {
			_ = m.deps.Repo.UnlockTransactionStockCommit(c.Request.Context(), orgID, txn.ID)
			return models.Transaction{}, errors.New("invalid transaction items")
		}
		_, err := m.deps.Repo.CommitReservedStock(c.Request.Context(), orgID, txn.BranchID, it.ID, it.Quantity)
		if err != nil {
			rollbackStock()
			_ = m.deps.Repo.UnlockTransactionStockCommit(c.Request.Context(), orgID, txn.ID)
			return models.Transaction{}, errors.New("failed to commit stock")
		}
		committed = append(committed, committedItem{productID: it.ID, qty: it.Quantity})
	}

	// Compute COGS per item based on product's costing method.
	costingSvc := costing.New(m.deps.Repo)
	itemCost := make(map[string]int64, len(txn.Items))
	allLines := make([]models.CostLine, 0, len(txn.Items))
	var totalCOGS int64

	for _, it := range txn.Items {
		// Get product to check costing method
		product, perr := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, it.ID)
		if perr != nil {
			rollbackStock()
			_ = m.deps.Repo.UnlockTransactionStockCommit(c.Request.Context(), orgID, txn.ID)
			return models.Transaction{}, errors.New("failed to get product for COGS calculation")
		}

		// Use costing service to compute COGS based on product's method
		result, err := costingSvc.ComputeCOGS(c.Request.Context(), orgID, txn.BranchID, product, it.Quantity)
		if err != nil && errors.Is(err, repo.ErrInsufficientLots) {
			// Fallback for FIFO: create an adjustment lot using the product's last purchase cost.
			_, _ = m.deps.Repo.CreateInventoryLot(c.Request.Context(), models.InventoryLot{
				ID:           primitive.NewObjectID().Hex(),
				OrgID:        orgID,
				BranchID:     txn.BranchID,
				ProductID:    it.ID,
				Source:       "ADJUSTMENT",
				UnitCost:     product.Cost,
				QtyReceived:  it.Quantity,
				QtyRemaining: it.Quantity,
				ReceivedAt:   time.Now().UTC(),
			})
			result, err = costingSvc.ComputeCOGS(c.Request.Context(), orgID, txn.BranchID, product, it.Quantity)
		}
		if err != nil {
			// Rollback lots + stock best-effort.
			for _, l := range allLines {
				_ = m.deps.Repo.IncrementLotRemaining(c.Request.Context(), l.LotID, l.Quantity)
			}
			rollbackStock()
			_ = m.deps.Repo.UnlockTransactionStockCommit(c.Request.Context(), orgID, txn.ID)
			return models.Transaction{}, err
		}

		// Update product total quantity for moving average tracking
		_ = costingSvc.UpdateMovingAverageOnSale(c.Request.Context(), orgID, it.ID, it.Quantity)

		allLines = append(allLines, result.CostLines...)
		itemCost[it.ID] += result.TotalCOGS
		totalCOGS += result.TotalCOGS
	}

	updatedItems := make([]models.TransactionItem, 0, len(txn.Items))
	for _, it := range txn.Items {
		lc := itemCost[it.ID]
		it.LineCost = lc
		if it.Quantity > 0 {
			it.Cost = lc / int64(it.Quantity)
		} else {
			it.Cost = 0
		}
		updatedItems = append(updatedItems, it)
	}

	patch := bson.M{
		"fulfillmentStatus":      "DELIVERED",
		"items":                 updatedItems,
		"cogs":                  totalCOGS,
		"profit":                txn.Total - totalCOGS,
		"costLines":             allLines,
		"stockCommitted":        true,
		"stockCommitInProgress": false,
	}

	if carrier != "" || trackingNumber != "" || txn.ShippingInfo != nil {
		shipping := txn.ShippingInfo
		if shipping == nil {
			shipping = &models.ShippingInfo{}
		}
		if strings.TrimSpace(carrier) != "" {
			shipping.Carrier = strings.TrimSpace(carrier)
		}
		if strings.TrimSpace(trackingNumber) != "" {
			shipping.TrackingNumber = strings.TrimSpace(trackingNumber)
		}
		shipping.DeliveredDate = time.Now().UTC().Format(time.RFC3339)
		patch["shippingInfo"] = shipping
	}

	updated, err := m.deps.Repo.UpdateTransactionByOrg(c.Request.Context(), orgID, txn.ID, patch)
	if err != nil {
		// Best-effort rollback.
		for _, l := range allLines {
			_ = m.deps.Repo.IncrementLotRemaining(c.Request.Context(), l.LotID, l.Quantity)
		}
		rollbackStock()
		_ = m.deps.Repo.UnlockTransactionStockCommit(c.Request.Context(), orgID, txn.ID)
		return models.Transaction{}, err
	}

	// Update customer points/total spent at delivery time (so cancelled orders don't earn points).
	if strings.TrimSpace(updated.CustomerID) != "" {
		pointsEarned := int(updated.Total / 100)
		_, _ = m.deps.Mongo.Collection(repo.ColCustomers).UpdateOne(
			c.Request.Context(),
			bson.M{"_id": updated.CustomerID, "orgId": orgID},
			bson.M{"$inc": bson.M{"points": pointsEarned, "totalSpent": updated.Total}},
		)
	}

	return updated, nil
}

type bulkStatusRequest struct {
	IDs    []string `json:"ids"`
	Status string   `json:"status"`
}

func (m *Module) bulkStatus(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req bulkStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	if len(req.IDs) == 0 || strings.TrimSpace(req.Status) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids and status are required"})
		return
	}

	status := strings.ToUpper(strings.TrimSpace(req.Status))
	if status == "DELIVERED" {
		updatedCount := int64(0)
		for _, id := range req.IDs {
			txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
			if err != nil {
				continue
			}
			if strings.ToUpper(txn.Type) != "SALE" {
				continue
			}
			if _, err := m.commitSaleDelivered(c, orgID, txn, "", ""); err == nil {
				updatedCount++
			}
		}
		c.JSON(http.StatusOK, gin.H{"updated": updatedCount})
		return
	}
	modified, err := m.deps.Repo.BulkUpdateTransactionsByOrg(c.Request.Context(), orgID, req.IDs, bson.M{
		"fulfillmentStatus": status,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update orders"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"updated": modified})
}

type cancelRequest struct {
	Reason  string `json:"reason"`
	Restock bool   `json:"restock"`
}

func (m *Module) cancel(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	var req cancelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	wasShipped := txn.FulfillmentStatus == "SHIPPED" || txn.FulfillmentStatus == "DELIVERED"
	newFulfillmentStatus := "CANCELLED"
	if wasShipped {
		newFulfillmentStatus = "RETURNED"
	}
	newFinancialStatus := "CANCELLED"
	if txn.Status == "COMPLETED" {
		newFinancialStatus = "REFUNDED"
	}

	updated, err := m.deps.Repo.UpdateTransactionByOrg(c.Request.Context(), orgID, id, bson.M{
		"status":             newFinancialStatus,
		"fulfillmentStatus":  newFulfillmentStatus,
		"cancellationReason": strings.TrimSpace(req.Reason),
		"stockCommitInProgress": false,
	})
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to cancel order"})
		return
	}

	if updated.StockCommitted {
		if req.Restock {
			// Restock physical inventory and create return lots so FIFO remains consistent.
			for _, item := range updated.Items {
				_, _ = m.deps.Repo.AdjustStock(c.Request.Context(), orgID, updated.BranchID, item.ID, item.Quantity)
				unitCost := int64(0)
				if item.Quantity > 0 {
					unitCost = item.LineCost / int64(item.Quantity)
				}
				_, _ = m.deps.Repo.CreateInventoryLot(c.Request.Context(), models.InventoryLot{
					ID:           primitive.NewObjectID().Hex(),
					OrgID:        orgID,
					BranchID:     updated.BranchID,
					ProductID:    item.ID,
					Source:       "RETURN",
					UnitCost:     unitCost,
					QtyReceived:  item.Quantity,
					QtyRemaining: item.Quantity,
					ReceivedAt:   time.Now().UTC(),
				})
			}
		}
	} else {
		// Order not delivered yet: always release reservations.
		for _, item := range updated.Items {
			_, _ = m.deps.Repo.ReleaseReservedStock(c.Request.Context(), orgID, updated.BranchID, item.ID, item.Quantity)
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// --- New Order Creation Endpoints ---

type createOrderItem struct {
	ProductID string `json:"productId"`
	VariantID string `json:"variantId,omitempty"`
	Quantity  int    `json:"quantity"`
	UnitPrice int64  `json:"unitPrice"`
	Discount  int64  `json:"discount,omitempty"`
}

type createOrderRequest struct {
	BranchID       string            `json:"branchId"`
	Channel        string            `json:"channel"`
	OrderDate      string            `json:"orderDate,omitempty"`
	CustomerID     string            `json:"customerId,omitempty"`
	CustomerName   string            `json:"customerName"`
	CustomerPhone  string            `json:"customerPhone,omitempty"`
	CustomerEmail  string            `json:"customerEmail,omitempty"`
	Items          []createOrderItem `json:"items"`
	DiscountAmount int64             `json:"discountAmount,omitempty"`
	TaxRate        float64           `json:"taxRate,omitempty"`
	ShippingCost   int64             `json:"shippingCost,omitempty"`
	CustomerNote   string            `json:"customerNote,omitempty"`
	InternalNote   string            `json:"internalNote,omitempty"`
	Recipient      struct {
		Name       string `json:"name"`
		Phone      string `json:"phone"`
		Address    string `json:"address"`
		City       string `json:"city,omitempty"`
		Province   string `json:"province,omitempty"`
		PostalCode string `json:"postalCode,omitempty"`
	} `json:"recipient,omitempty"`
	SaveAsDraft bool `json:"saveAsDraft,omitempty"`
}

func (m *Module) createOrder(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	branchID := auth.GetBranchIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req createOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "items are required"})
		return
	}

	// Use provided branchId or fallback to header
	if req.BranchID != "" {
		branchID = req.BranchID
	}
	if branchID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "branch context required"})
		return
	}

	// Build transaction items with custom prices
	items := make([]models.TransactionItem, 0, len(req.Items))
	var subtotal int64
	for _, it := range req.Items {
		if it.Quantity <= 0 || strings.TrimSpace(it.ProductID) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid items"})
			return
		}
		p, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, strings.TrimSpace(it.ProductID))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid productId: " + it.ProductID})
			return
		}

		// Use custom price if provided, otherwise use product price
		unitPrice := it.UnitPrice
		if unitPrice <= 0 {
			unitPrice = p.Price
		}

		lineTotal := unitPrice*int64(it.Quantity) - it.Discount
		subtotal += lineTotal

		items = append(items, models.TransactionItem{
			ID:       p.ID,
			SKU:      p.SKU,
			Name:     p.Name,
			Category: p.Category,
			Image:    p.Image,
			Price:    unitPrice,
			Cost:     0,
			LineCost: 0,
			Quantity: it.Quantity,
		})
	}

	// Calculate totals (TaxRate is stored as percentage, e.g., 7 for 7%)
	taxAmount := int64(float64(subtotal-req.DiscountAmount) * (req.TaxRate / 100))
	total := subtotal - req.DiscountAmount + taxAmount + req.ShippingCost

	// Generate order ID
	orderID := "ORD-" + primitive.NewObjectID().Hex()[18:]

	// Set dates
	now := time.Now().UTC()
	orderDate := now.Format(time.RFC3339)
	if req.OrderDate != "" {
		orderDate = req.OrderDate
	}

	// Determine status
	status := "PENDING"
	if req.SaveAsDraft {
		status = "DRAFT"
	}

	// Get customer info
	recipientName := req.CustomerName
	if recipientName == "" {
		recipientName = "Walk-in Customer"
	}
	recipientPhone := req.CustomerPhone

	// Use recipient info if provided
	recipientAddress := ""
	if req.Recipient.Name != "" {
		recipientName = req.Recipient.Name
		recipientPhone = req.Recipient.Phone
		recipientAddress = req.Recipient.Address
		if req.Recipient.City != "" {
			recipientAddress += ", " + req.Recipient.City
		}
		if req.Recipient.Province != "" {
			recipientAddress += ", " + req.Recipient.Province
		}
		if req.Recipient.PostalCode != "" {
			recipientAddress += " " + req.Recipient.PostalCode
		}
	}

	// Set channel
	channel := strings.ToUpper(strings.TrimSpace(req.Channel))
	if channel == "" {
		channel = "WEB"
	}

	txn := models.Transaction{
		ID:                    orderID,
		OrgID:                 orgID,
		BranchID:              branchID,
		Date:                  orderDate,
		Channel:               channel,
		Type:                  "SALE",
		Status:                status,
		FulfillmentStatus:     "PENDING",
		Items:                 items,
		Total:                 total,
		UserID:                u.ID,
		CustomerID:            strings.TrimSpace(req.CustomerID),
		RecipientName:         recipientName,
		RecipientPhone:        recipientPhone,
		RecipientAddress:      recipientAddress,
		Note:                  strings.TrimSpace(req.InternalNote),
		StockCommitted:        false,
		StockCommitInProgress: false,
	}

	// Reserve stock for non-draft orders
	if status != "DRAFT" {
		reserved := make([]models.TransactionItem, 0, len(items))
		for _, it := range items {
			_, _ = m.deps.Repo.AdjustStock(c.Request.Context(), orgID, branchID, it.ID, 0)
			_, err := m.deps.Repo.ReserveStock(c.Request.Context(), orgID, branchID, it.ID, it.Quantity)
			if err != nil {
				// Rollback reservations
				for _, done := range reserved {
					_, _ = m.deps.Repo.ReleaseReservedStock(c.Request.Context(), orgID, branchID, done.ID, done.Quantity)
				}
				if errors.Is(err, repo.ErrInsufficientStock) {
					c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient stock", "productId": it.ID})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reserve stock"})
				return
			}
			reserved = append(reserved, it)
		}
	}

	created, err := m.deps.Repo.CreateTransaction(c.Request.Context(), txn)
	if err != nil {
		// Release reservations on failure
		if status != "DRAFT" {
			for _, it := range items {
				_, _ = m.deps.Repo.ReleaseReservedStock(c.Request.Context(), orgID, branchID, it.ID, it.Quantity)
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create order"})
		return
	}

	// Get branch name for response
	branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	branchName := ""
	for _, b := range branches {
		if b.ID == branchID {
			branchName = b.Name
			break
		}
	}

	c.JSON(http.StatusCreated, gin.H{"data": m.transactionToOrder(created, branchName)})
}

func (m *Module) updateOrder(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	// Only allow updating draft or pending orders
	if txn.Status != "DRAFT" && txn.Status != "PENDING" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only update draft or pending orders"})
		return
	}

	var req createOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	patch := bson.M{}

	// Update items if provided
	if len(req.Items) > 0 {
		// Release old reservations if status is not DRAFT
		if txn.Status != "DRAFT" {
			for _, item := range txn.Items {
				_, _ = m.deps.Repo.ReleaseReservedStock(c.Request.Context(), orgID, txn.BranchID, item.ID, item.Quantity)
			}
		}

		// Build new items
		items := make([]models.TransactionItem, 0, len(req.Items))
		var subtotal int64
		for _, it := range req.Items {
			if it.Quantity <= 0 || strings.TrimSpace(it.ProductID) == "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid items"})
				return
			}
			p, perr := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, strings.TrimSpace(it.ProductID))
			if perr != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid productId: " + it.ProductID})
				return
			}

			unitPrice := it.UnitPrice
			if unitPrice <= 0 {
				unitPrice = p.Price
			}

			lineTotal := unitPrice*int64(it.Quantity) - it.Discount
			subtotal += lineTotal

			items = append(items, models.TransactionItem{
				ID:       p.ID,
				SKU:      p.SKU,
				Name:     p.Name,
				Category: p.Category,
				Image:    p.Image,
				Price:    unitPrice,
				Cost:     0,
				LineCost: 0,
				Quantity: it.Quantity,
			})
		}

		// Reserve new stock if not draft
		if txn.Status != "DRAFT" {
			reserved := make([]models.TransactionItem, 0, len(items))
			for _, it := range items {
				_, _ = m.deps.Repo.AdjustStock(c.Request.Context(), orgID, txn.BranchID, it.ID, 0)
				_, rerr := m.deps.Repo.ReserveStock(c.Request.Context(), orgID, txn.BranchID, it.ID, it.Quantity)
				if rerr != nil {
					for _, done := range reserved {
						_, _ = m.deps.Repo.ReleaseReservedStock(c.Request.Context(), orgID, txn.BranchID, done.ID, done.Quantity)
					}
					if errors.Is(rerr, repo.ErrInsufficientStock) {
						c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient stock", "productId": it.ID})
						return
					}
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reserve stock"})
					return
				}
				reserved = append(reserved, it)
			}
		}

		// TaxRate is stored as percentage, e.g., 7 for 7%
		taxAmount := int64(float64(subtotal-req.DiscountAmount) * (req.TaxRate / 100))
		total := subtotal - req.DiscountAmount + taxAmount + req.ShippingCost

		patch["items"] = items
		patch["total"] = total
	}

	// Update other fields if provided
	if req.CustomerName != "" {
		patch["recipientName"] = req.CustomerName
	}
	if req.CustomerPhone != "" {
		patch["recipientPhone"] = req.CustomerPhone
	}
	if req.CustomerID != "" {
		patch["customerId"] = req.CustomerID
	}
	if req.InternalNote != "" {
		patch["note"] = req.InternalNote
	}
	if req.Channel != "" {
		patch["channel"] = strings.ToUpper(req.Channel)
	}

	// Handle status change from DRAFT to PENDING
	if txn.Status == "DRAFT" && !req.SaveAsDraft {
		patch["status"] = "PENDING"
		// Reserve stock when submitting draft
		for _, it := range txn.Items {
			_, _ = m.deps.Repo.AdjustStock(c.Request.Context(), orgID, txn.BranchID, it.ID, 0)
			_, _ = m.deps.Repo.ReserveStock(c.Request.Context(), orgID, txn.BranchID, it.ID, it.Quantity)
		}
	}

	if len(patch) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	updated, err := m.deps.Repo.UpdateTransactionByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update order"})
		return
	}

	branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	branchName := ""
	for _, b := range branches {
		if b.ID == updated.BranchID {
			branchName = b.Name
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": m.transactionToOrder(updated, branchName)})
}

type quickAddRequest struct {
	BranchID      string `json:"branchId"`
	Channel       string `json:"channel"`
	CustomerName  string `json:"customerName,omitempty"`
	Items         []struct {
		ProductID string `json:"productId"`
		VariantID string `json:"variantId,omitempty"`
		Quantity  int    `json:"quantity"`
		UnitPrice int64  `json:"unitPrice"`
	} `json:"items"`
	PaymentMethod  string `json:"paymentMethod"`
	PaymentAmount  int64  `json:"paymentAmount"`
	DiscountAmount int64  `json:"discountAmount,omitempty"`
}

func (m *Module) quickAdd(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	branchID := auth.GetBranchIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req quickAddRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "items are required"})
		return
	}

	if req.BranchID != "" {
		branchID = req.BranchID
	}
	if branchID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "branch context required"})
		return
	}

	// Build items with custom prices
	items := make([]models.TransactionItem, 0, len(req.Items))
	var total int64
	for _, it := range req.Items {
		if it.Quantity <= 0 || strings.TrimSpace(it.ProductID) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid items"})
			return
		}
		p, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, strings.TrimSpace(it.ProductID))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid productId"})
			return
		}

		unitPrice := it.UnitPrice
		if unitPrice <= 0 {
			unitPrice = p.Price
		}

		items = append(items, models.TransactionItem{
			ID:       p.ID,
			SKU:      p.SKU,
			Name:     p.Name,
			Category: p.Category,
			Image:    p.Image,
			Price:    unitPrice,
			Cost:     0,
			LineCost: 0,
			Quantity: it.Quantity,
		})
		total += unitPrice * int64(it.Quantity)
	}

	total -= req.DiscountAmount

	recipientName := "Walk-in Customer"
	if req.CustomerName != "" {
		recipientName = req.CustomerName
	}

	channel := strings.ToUpper(strings.TrimSpace(req.Channel))
	if channel == "" {
		channel = "POS"
	}

	orderID := "ORD-" + primitive.NewObjectID().Hex()[18:]
	now := time.Now().UTC().Format(time.RFC3339)
	txn := models.Transaction{
		ID:                    orderID,
		OrgID:                 orgID,
		BranchID:              branchID,
		Date:                  now,
		Channel:               channel,
		Type:                  "SALE",
		Status:                "COMPLETED",
		FulfillmentStatus:     "PENDING",
		Items:                 items,
		Total:                 total,
		UserID:                u.ID,
		CustomerID:            "",
		RecipientName:         recipientName,
		RecipientPhone:        "",
		PaymentMethod:         strings.TrimSpace(req.PaymentMethod),
		Note:                  "",
		StockCommitted:        false,
		StockCommitInProgress: false,
	}

	// Reserve stock
	reserved := make([]models.TransactionItem, 0, len(items))
	for _, it := range items {
		_, _ = m.deps.Repo.AdjustStock(c.Request.Context(), orgID, branchID, it.ID, 0)
		_, err := m.deps.Repo.ReserveStock(c.Request.Context(), orgID, branchID, it.ID, it.Quantity)
		if err != nil {
			for _, done := range reserved {
				_, _ = m.deps.Repo.ReleaseReservedStock(c.Request.Context(), orgID, branchID, done.ID, done.Quantity)
			}
			if errors.Is(err, repo.ErrInsufficientStock) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient stock", "productId": it.ID})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reserve stock"})
			return
		}
		reserved = append(reserved, it)
	}

	created, err := m.deps.Repo.CreateTransaction(c.Request.Context(), txn)
	if err != nil {
		for _, done := range reserved {
			_, _ = m.deps.Repo.ReleaseReservedStock(c.Request.Context(), orgID, branchID, done.ID, done.Quantity)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create transaction"})
		return
	}

	// Auto-deliver for quick add
	updated, err := m.commitSaleDelivered(c, orgID, created, "", "")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	branchName := ""
	for _, b := range branches {
		if b.ID == branchID {
			branchName = b.Name
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": m.transactionToOrder(updated, branchName)})
}

func (m *Module) nextNumber(c *gin.Context) {
	// Generate next order number
	orderNumber := "ORD-" + primitive.NewObjectID().Hex()[18:]
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"orderNumber": orderNumber}})
}

// --- Order Lifecycle Endpoints ---

func (m *Module) confirm(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	// Only allow confirming PENDING or DRAFT orders
	if txn.Status != "PENDING" && txn.Status != "DRAFT" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only confirm pending or draft orders"})
		return
	}

	// If draft, reserve stock first
	if txn.Status == "DRAFT" {
		for _, it := range txn.Items {
			_, _ = m.deps.Repo.AdjustStock(c.Request.Context(), orgID, txn.BranchID, it.ID, 0)
			_, err := m.deps.Repo.ReserveStock(c.Request.Context(), orgID, txn.BranchID, it.ID, it.Quantity)
			if err != nil {
				if errors.Is(err, repo.ErrInsufficientStock) {
					c.JSON(http.StatusBadRequest, gin.H{"error": "insufficient stock", "productId": it.ID})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reserve stock"})
				return
			}
		}
	}

	updated, err := m.deps.Repo.UpdateTransactionByOrg(c.Request.Context(), orgID, id, bson.M{
		"status":            "CONFIRMED",
		"fulfillmentStatus": "PROCESSING",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to confirm order"})
		return
	}

	branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	branchName := ""
	for _, b := range branches {
		if b.ID == updated.BranchID {
			branchName = b.Name
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": m.transactionToOrder(updated, branchName)})
}

func (m *Module) complete(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	// Order must be confirmed and delivered to complete
	if txn.FulfillmentStatus != "DELIVERED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "order must be delivered before completing"})
		return
	}

	updated, err := m.deps.Repo.UpdateTransactionByOrg(c.Request.Context(), orgID, id, bson.M{
		"status": "COMPLETED",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete order"})
		return
	}

	branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	branchName := ""
	for _, b := range branches {
		if b.ID == updated.BranchID {
			branchName = b.Name
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": m.transactionToOrder(updated, branchName)})
}

type recordPaymentRequest struct {
	Method string `json:"method"`
	Amount int64  `json:"amount"`
	Note   string `json:"note"`
}

func (m *Module) recordPayment(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	var req recordPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	// Cannot record payment for cancelled/refunded orders
	if txn.Status == "CANCELLED" || txn.Status == "REFUNDED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot record payment for cancelled or refunded orders"})
		return
	}

	patch := bson.M{
		"paymentMethod": strings.TrimSpace(req.Method),
		"status":        "COMPLETED",
	}
	if req.Note != "" {
		patch["paymentNote"] = strings.TrimSpace(req.Note)
	}

	updated, err := m.deps.Repo.UpdateTransactionByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record payment"})
		return
	}

	branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	branchName := ""
	for _, b := range branches {
		if b.ID == updated.BranchID {
			branchName = b.Name
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": m.transactionToOrder(updated, branchName)})
}

type shipRequest struct {
	Carrier        string `json:"carrier"`
	TrackingNumber string `json:"trackingNumber"`
}

func (m *Module) markShipped(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	var req shipRequest
	_ = c.ShouldBindJSON(&req) // Optional body

	txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	// Cannot ship cancelled orders
	if txn.Status == "CANCELLED" || txn.Status == "REFUNDED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot ship cancelled or refunded orders"})
		return
	}

	shipping := txn.ShippingInfo
	if shipping == nil {
		shipping = &models.ShippingInfo{}
	}
	if strings.TrimSpace(req.Carrier) != "" {
		shipping.Carrier = strings.TrimSpace(req.Carrier)
	}
	if strings.TrimSpace(req.TrackingNumber) != "" {
		shipping.TrackingNumber = strings.TrimSpace(req.TrackingNumber)
	}
	shipping.ShippedDate = time.Now().UTC().Format(time.RFC3339)

	updated, err := m.deps.Repo.UpdateTransactionByOrg(c.Request.Context(), orgID, id, bson.M{
		"fulfillmentStatus": "SHIPPED",
		"shippingInfo":      shipping,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark as shipped"})
		return
	}

	branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	branchName := ""
	for _, b := range branches {
		if b.ID == updated.BranchID {
			branchName = b.Name
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": m.transactionToOrder(updated, branchName)})
}

func (m *Module) markDelivered(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	// Cannot deliver cancelled orders
	if txn.Status == "CANCELLED" || txn.Status == "REFUNDED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot deliver cancelled or refunded orders"})
		return
	}

	// Use existing commitSaleDelivered for SALE type orders
	if strings.ToUpper(txn.Type) == "SALE" {
		updated, err := m.commitSaleDelivered(c, orgID, txn, "", "")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
		branchName := ""
		for _, b := range branches {
			if b.ID == updated.BranchID {
				branchName = b.Name
				break
			}
		}

		c.JSON(http.StatusOK, gin.H{"data": m.transactionToOrder(updated, branchName)})
		return
	}

	// For non-SALE orders, just update the status
	updated, err := m.deps.Repo.UpdateTransactionByOrg(c.Request.Context(), orgID, id, bson.M{
		"fulfillmentStatus": "DELIVERED",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark as delivered"})
		return
	}

	branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	branchName := ""
	for _, b := range branches {
		if b.ID == updated.BranchID {
			branchName = b.Name
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": m.transactionToOrder(updated, branchName)})
}

type TimelineEvent struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Status    string `json:"status"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
	UserID    string `json:"userId,omitempty"`
}

func (m *Module) getTimeline(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	txn, err := m.deps.Repo.GetTransactionByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	// Build timeline from transaction data
	timeline := make([]TimelineEvent, 0)

	// Order created
	timeline = append(timeline, TimelineEvent{
		ID:        "1",
		Type:      "ORDER_CREATED",
		Status:    "completed",
		Message:   "Order created",
		Timestamp: txn.CreatedAt.Format(time.RFC3339),
		UserID:    txn.UserID,
	})

	// Payment if completed
	if txn.Status == "COMPLETED" || txn.PaymentMethod != "" {
		timeline = append(timeline, TimelineEvent{
			ID:        "2",
			Type:      "PAYMENT_RECEIVED",
			Status:    "completed",
			Message:   "Payment received via " + txn.PaymentMethod,
			Timestamp: txn.UpdatedAt.Format(time.RFC3339),
		})
	}

	// Shipping info
	if txn.ShippingInfo != nil {
		if txn.ShippingInfo.ShippedDate != "" {
			timeline = append(timeline, TimelineEvent{
				ID:        "3",
				Type:      "SHIPPED",
				Status:    "completed",
				Message:   "Order shipped" + carrierInfo(txn.ShippingInfo),
				Timestamp: txn.ShippingInfo.ShippedDate,
			})
		}
		if txn.ShippingInfo.DeliveredDate != "" {
			timeline = append(timeline, TimelineEvent{
				ID:        "4",
				Type:      "DELIVERED",
				Status:    "completed",
				Message:   "Order delivered",
				Timestamp: txn.ShippingInfo.DeliveredDate,
			})
		}
	} else if txn.FulfillmentStatus == "DELIVERED" {
		timeline = append(timeline, TimelineEvent{
			ID:        "4",
			Type:      "DELIVERED",
			Status:    "completed",
			Message:   "Order delivered",
			Timestamp: txn.UpdatedAt.Format(time.RFC3339),
		})
	}

	// Cancellation
	if txn.Status == "CANCELLED" || txn.Status == "REFUNDED" {
		msg := "Order cancelled"
		if txn.CancellationReason != "" {
			msg += ": " + txn.CancellationReason
		}
		timeline = append(timeline, TimelineEvent{
			ID:        "5",
			Type:      "CANCELLED",
			Status:    "completed",
			Message:   msg,
			Timestamp: txn.UpdatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": timeline})
}

func carrierInfo(s *models.ShippingInfo) string {
	if s == nil {
		return ""
	}
	info := ""
	if s.Carrier != "" {
		info += " via " + s.Carrier
	}
	if s.TrackingNumber != "" {
		info += " (tracking: " + s.TrackingNumber + ")"
	}
	return info
}
