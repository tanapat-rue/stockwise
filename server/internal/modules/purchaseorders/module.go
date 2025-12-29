package purchaseordersmodule

import (
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
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/gin-gonic/gin"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "purchase_orders" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/purchase-orders")
	g.Use(auth.RequireUser(), auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager))

	g.GET("", m.list)
	g.GET("/next-reference", m.nextReference)
	g.GET("/next-number", m.nextReference) // Alias for frontend compatibility
	g.GET("/stats", m.stats)
	g.GET("/:id", m.get)
	g.POST("", m.create)
	g.PATCH("/:id", m.update)
	g.DELETE("/:id", m.delete)
	g.POST("/:id/receive", m.receive)
	g.POST("/:id/cancel", m.cancel)
	g.POST("/:id/submit", m.submit)
	g.POST("/:id/duplicate", m.duplicate)
	g.POST("/:id/payment", m.recordPayment)
	g.POST("/:id/status", m.updateStatus)
	g.POST("/bulk-status", m.bulkUpdateStatus)
}

// POResponse is the frontend-expected format for purchase orders
type POResponse struct {
	ID                   string           `json:"id"`
	OrgID                string           `json:"orgId"`
	BranchID             string           `json:"branchId"`
	BranchName           string           `json:"branchName"`
	OrderNumber          string           `json:"orderNumber"`
	ReferenceNumber      string           `json:"referenceNumber,omitempty"`
	OrderDate            string           `json:"orderDate"`
	ExpectedDeliveryDate string           `json:"expectedDeliveryDate,omitempty"`
	ReceivedDate         string           `json:"receivedDate,omitempty"`
	SupplierID           string           `json:"supplierId"`
	SupplierName         string           `json:"supplierName"`
	SupplierCode         string           `json:"supplierCode,omitempty"`
	Status               string           `json:"status"`
	PaymentStatus        string           `json:"paymentStatus"`
	Items                []POItemResponse `json:"items"`
	Subtotal             int64            `json:"subtotal"`
	DiscountAmount       int64            `json:"discountAmount"`
	TaxRate              float64          `json:"taxRate"`
	TaxAmount            int64            `json:"taxAmount"`
	ShippingCost         int64            `json:"shippingCost"`
	TotalAmount          int64            `json:"totalAmount"`
	PaidAmount           int64            `json:"paidAmount"`
	DueAmount            int64            `json:"dueAmount"`
	Notes                string           `json:"notes,omitempty"`
	InternalNotes        string           `json:"internalNotes,omitempty"`
	CreatedBy            string           `json:"createdBy"`
	CreatedByName        string           `json:"createdByName"`
	CreatedAt            string           `json:"createdAt"`
	UpdatedAt            string           `json:"updatedAt"`
}

type POItemResponse struct {
	ID          string `json:"id"`
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	ProductSku  string `json:"productSku"`
	Unit        string `json:"unit"`
	QtyOrdered  int    `json:"qtyOrdered"`
	QtyReceived int    `json:"qtyReceived"`
	QtyPending  int    `json:"qtyPending"`
	UnitCost    int64  `json:"unitCost"`
	Discount    int64  `json:"discount"`
	LineTotal   int64  `json:"lineTotal"`
}

func (m *Module) poToResponse(po models.PurchaseOrder, supplierName, branchName string) POResponse {
	items := make([]POItemResponse, 0, len(po.Items))
	var subtotal int64
	for i, it := range po.Items {
		lineTotal := int64(it.Quantity)*it.UnitCost - it.Discount
		subtotal += lineTotal
		qtyReceived := 0
		if po.Status == "RECEIVED" {
			qtyReceived = it.Quantity
		}

		// Use stored SKU and unit, or fallback to defaults
		productSku := it.ProductSKU
		unit := it.Unit
		if unit == "" {
			unit = "pcs"
		}

		items = append(items, POItemResponse{
			ID:          po.ID + "-item-" + string(rune('0'+i)),
			ProductID:   it.ProductID,
			ProductName: it.ProductName,
			ProductSku:  productSku,
			Unit:        unit,
			QtyOrdered:  it.Quantity,
			QtyReceived: qtyReceived,
			QtyPending:  it.Quantity - qtyReceived,
			UnitCost:    it.UnitCost,
			Discount:    it.Discount,
			LineTotal:   lineTotal,
		})
	}

	// Map backend status to frontend status
	// Backend uses: OPEN, SENT, RECEIVING, RECEIVED, CANCELLED
	// Frontend expects: DRAFT, SENT, PENDING, PARTIAL, RECEIVED, CANCELLED
	status := po.Status
	switch po.Status {
	case "OPEN":
		status = "DRAFT" // New POs that haven't been submitted yet
	case "SENT":
		status = "SENT" // Submitted to supplier
	case "RECEIVING":
		status = "PENDING" // In progress
	}

	// Calculate tax amount from rate (rate is stored as percentage, e.g., 7 for 7%)
	taxAmount := int64(float64(subtotal-po.DiscountAmount) * (po.TaxRate / 100))
	totalAmount := subtotal - po.DiscountAmount + taxAmount + po.ShippingCost

	// Determine payment status based on actual paid amount
	paymentStatus := "UNPAID"
	if po.PaidAmount > 0 {
		if po.PaidAmount >= totalAmount {
			paymentStatus = "PAID"
		} else {
			paymentStatus = "PARTIAL"
		}
	}

	return POResponse{
		ID:                   po.ID,
		OrgID:                po.OrgID,
		BranchID:             po.BranchID,
		BranchName:           branchName,
		OrderNumber:          po.ReferenceNo,
		ReferenceNumber:      po.ReferenceNo,
		OrderDate:            po.Date,
		ExpectedDeliveryDate: po.ExpectedDeliveryDate,
		ReceivedDate:         po.ReceivedDate,
		SupplierID:           po.SupplierID,
		SupplierName:         supplierName,
		Status:               status,
		PaymentStatus:        paymentStatus,
		Items:                items,
		Subtotal:             subtotal,
		DiscountAmount:       po.DiscountAmount,
		TaxRate:              po.TaxRate,
		TaxAmount:            taxAmount,
		ShippingCost:         po.ShippingCost,
		TotalAmount:          totalAmount,
		PaidAmount:           po.PaidAmount,
		DueAmount:            totalAmount - po.PaidAmount,
		Notes:                po.Note,
		InternalNotes:        po.InternalNotes,
		CreatedBy:            "",
		CreatedByName:        "",
		CreatedAt:            po.CreatedAt.Format(time.RFC3339),
		UpdatedAt:            po.UpdatedAt.Format(time.RFC3339),
	}
}

func (m *Module) list(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	pos, err := m.deps.Repo.ListPurchaseOrdersByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list purchase orders"})
		return
	}

	// Get suppliers and branches for names
	suppliers, _ := m.deps.Repo.ListSuppliersByOrg(c.Request.Context(), orgID)
	supplierNames := make(map[string]string)
	for _, s := range suppliers {
		supplierNames[s.ID] = s.Name
	}
	branches, _ := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	branchNames := make(map[string]string)
	for _, b := range branches {
		branchNames[b.ID] = b.Name
	}

	// Query params for filtering
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))
	statusFilter := strings.ToUpper(strings.TrimSpace(c.Query("status")))

	// Convert to frontend format with filtering
	result := make([]POResponse, 0, len(pos))
	for _, po := range pos {
		supplierName := supplierNames[po.SupplierID]
		branchName := branchNames[po.BranchID]

		// Status filter - map backend status to frontend status for comparison
		if statusFilter != "" {
			frontendStatus := po.Status
			switch po.Status {
			case "OPEN":
				frontendStatus = "DRAFT"
			case "RECEIVING":
				frontendStatus = "PENDING"
			}
			if frontendStatus != statusFilter {
				continue
			}
		}

		// Search filter - match against PO number, supplier name, or reference
		if search != "" {
			refMatch := strings.Contains(strings.ToLower(po.ReferenceNo), search)
			supplierMatch := strings.Contains(strings.ToLower(supplierName), search)
			if !refMatch && !supplierMatch {
				continue
			}
		}

		result = append(result, m.poToResponse(po, supplierName, branchName))
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

func (m *Module) get(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	po, err := m.deps.Repo.GetPurchaseOrderByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get purchase order"})
		return
	}

	// Get supplier and branch names
	supplierName := ""
	if supplier, err := m.deps.Repo.GetSupplierByOrg(c.Request.Context(), orgID, po.SupplierID); err == nil {
		supplierName = supplier.Name
	}
	branchName := ""
	if branch, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, po.BranchID); err == nil {
		branchName = branch.Name
	}

	c.JSON(http.StatusOK, gin.H{"data": m.poToResponse(po, supplierName, branchName)})
}

func (m *Module) delete(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	po, err := m.deps.Repo.GetPurchaseOrderByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get purchase order"})
		return
	}

	// Only allow deleting OPEN or CANCELLED purchase orders
	if po.Status != "OPEN" && po.Status != "CANCELLED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only delete OPEN or CANCELLED purchase orders"})
		return
	}

	if err := m.deps.Repo.DeletePurchaseOrderByOrg(c.Request.Context(), orgID, id); err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete purchase order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (m *Module) cancel(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	po, err := m.deps.Repo.GetPurchaseOrderByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get purchase order"})
		return
	}

	// Only allow cancelling OPEN purchase orders
	if po.Status != "OPEN" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only cancel OPEN purchase orders"})
		return
	}

	updated, err := m.deps.Repo.UpdatePurchaseOrderByOrg(c.Request.Context(), orgID, id, bson.M{
		"status": "CANCELLED",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to cancel purchase order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

type createPOItemRequest struct {
	ProductID   string `json:"productId"`
	ProductName string `json:"productName,omitempty"`
	ProductSku  string `json:"productSku,omitempty"`
	QtyOrdered  int    `json:"qtyOrdered"`
	Quantity    int    `json:"quantity"` // Alias for qtyOrdered
	UnitCost    int64  `json:"unitCost"`
	Discount    int64  `json:"discount,omitempty"`
}

type createPORequest struct {
	ReferenceNo          string                `json:"referenceNo"`
	ReferenceNumber      string                `json:"referenceNumber"` // Frontend alias
	SupplierID           string                `json:"supplierId"`
	BranchID             string                `json:"branchId"`
	OrderDate            string                `json:"orderDate,omitempty"`
	ExpectedDeliveryDate string                `json:"expectedDeliveryDate,omitempty"`
	Items                []createPOItemRequest `json:"items"`
	DiscountAmount       int64                 `json:"discountAmount,omitempty"`
	TaxRate              float64               `json:"taxRate,omitempty"`
	ShippingCost         int64                 `json:"shippingCost,omitempty"`
	ShippingChannel      string                `json:"shippingChannel,omitempty"`
	Notes                string                `json:"notes,omitempty"`
	Note                 string                `json:"note,omitempty"` // Alias
	InternalNotes        string                `json:"internalNotes,omitempty"`
}

func (m *Module) nextReference(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	seq, err := m.deps.Repo.PeekCounter(c.Request.Context(), "po:"+orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate reference"})
		return
	}

	nextSeq := seq + 1
	orderNumber := repo.FormatPurchaseOrderReference(nextSeq)
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"seq":         nextSeq,
			"referenceNo": orderNumber,
			"orderNumber": orderNumber, // Frontend expects this field
		},
	})
}

func (m *Module) create(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req createPORequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	req.ReferenceNo = strings.TrimSpace(req.ReferenceNo)
	req.SupplierID = strings.TrimSpace(req.SupplierID)
	req.BranchID = strings.TrimSpace(req.BranchID)
	if req.SupplierID == "" || req.BranchID == "" || len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "supplierId, branchId and items are required"})
		return
	}

	if _, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, req.BranchID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid branchId"})
		return
	}

	// Supplier must belong to the org.
	if _, err := m.deps.Repo.GetSupplierByOrg(c.Request.Context(), orgID, req.SupplierID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid supplierId"})
		return
	}

	if req.ReferenceNo == "" {
		seq, err := m.deps.Repo.NextCounter(c.Request.Context(), "po:"+orgID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate reference"})
			return
		}
		req.ReferenceNo = repo.FormatPurchaseOrderReference(seq)
	}

	// Convert request items to model items and compute total
	var total int64
	modelItems := make([]models.PurchaseOrderItem, 0, len(req.Items))
	for i := range req.Items {
		productID := strings.TrimSpace(req.Items[i].ProductID)
		productName := strings.TrimSpace(req.Items[i].ProductName)
		productSku := strings.TrimSpace(req.Items[i].ProductSku)
		// Use qtyOrdered if set, otherwise use quantity
		qty := req.Items[i].QtyOrdered
		if qty <= 0 {
			qty = req.Items[i].Quantity
		}
		if productID == "" || qty <= 0 || req.Items[i].UnitCost < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid items"})
			return
		}
		p, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, productID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid productId", "productId": productID})
			return
		}
		if productName == "" {
			productName = p.Name
		}
		if productSku == "" {
			productSku = p.SKU
		}
		lineTotal := int64(qty)*req.Items[i].UnitCost - req.Items[i].Discount
		total += lineTotal
		modelItems = append(modelItems, models.PurchaseOrderItem{
			ProductID:   productID,
			ProductName: productName,
			ProductSKU:  productSku,
			Quantity:    qty,
			UnitCost:    req.Items[i].UnitCost,
			Discount:    req.Items[i].Discount,
		})
	}

	// Use notes or note field
	note := strings.TrimSpace(req.Notes)
	if note == "" {
		note = strings.TrimSpace(req.Note)
	}

	// Use orderDate if provided
	orderDate := time.Now().UTC().Format(time.RFC3339)
	if req.OrderDate != "" {
		orderDate = req.OrderDate
	}

	po := models.PurchaseOrder{
		ID:                   "po-" + primitive.NewObjectID().Hex(),
		OrgID:                orgID,
		BranchID:             req.BranchID,
		ReferenceNo:          req.ReferenceNo,
		Date:                 orderDate,
		SupplierID:           req.SupplierID,
		Status:               "OPEN",
		Items:                modelItems,
		TotalCost:            total,
		DiscountAmount:       req.DiscountAmount,
		TaxRate:              req.TaxRate,
		ShippingCost:         req.ShippingCost,
		Note:                 note,
		InternalNotes:        strings.TrimSpace(req.InternalNotes),
		ShippingChannel:      strings.TrimSpace(req.ShippingChannel),
		ExpectedDeliveryDate: strings.TrimSpace(req.ExpectedDeliveryDate),
	}

	created, err := m.deps.Repo.CreatePurchaseOrder(c.Request.Context(), po)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "referenceNo already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create purchase order"})
		return
	}

	// Get supplier and branch names for response
	supplierName := ""
	if supplier, err := m.deps.Repo.GetSupplierByOrg(c.Request.Context(), orgID, created.SupplierID); err == nil {
		supplierName = supplier.Name
	}
	branchName := ""
	if branch, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, created.BranchID); err == nil {
		branchName = branch.Name
	}

	c.JSON(http.StatusCreated, gin.H{"data": m.poToResponse(created, supplierName, branchName)})
}

type updatePORequest struct {
	// Reference fields
	ReferenceNo     *string `json:"referenceNo"`
	ReferenceNumber *string `json:"referenceNumber"` // Alias
	OrderNumber     *string `json:"orderNumber"`     // Alias

	// Core fields
	SupplierID           *string `json:"supplierId"`
	BranchID             *string `json:"branchId"`
	OrderDate            *string `json:"orderDate"`
	ExpectedDeliveryDate *string `json:"expectedDeliveryDate"`

	// Items
	Items []createPOItemRequest `json:"items"`

	// Financial fields
	DiscountAmount *int64   `json:"discountAmount"`
	TaxRate        *float64 `json:"taxRate"`
	ShippingCost   *int64   `json:"shippingCost"`

	// Notes and shipping
	Notes           *string `json:"notes"`
	Note            *string `json:"note"` // Alias
	InternalNotes   *string `json:"internalNotes"`
	ShippingChannel *string `json:"shippingChannel"`
}

func (m *Module) update(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	poID := c.Param("id")

	// Get existing PO first
	existingPO, err := m.deps.Repo.GetPurchaseOrderByOrg(c.Request.Context(), orgID, poID)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get purchase order"})
		return
	}

	// Only allow updates on OPEN purchase orders
	if existingPO.Status != "OPEN" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only update OPEN purchase orders"})
		return
	}

	var req updatePORequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	patch := bson.M{}

	// Handle reference number (check all aliases)
	refNo := req.ReferenceNo
	if refNo == nil {
		refNo = req.ReferenceNumber
	}
	if refNo == nil {
		refNo = req.OrderNumber
	}
	if refNo != nil {
		ref := strings.TrimSpace(*refNo)
		if ref == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "referenceNo cannot be empty"})
			return
		}
		patch["referenceNo"] = ref
	}

	// Handle note (check alias)
	noteVal := req.Notes
	if noteVal == nil {
		noteVal = req.Note
	}
	if noteVal != nil {
		patch["note"] = strings.TrimSpace(*noteVal)
	}

	// Handle supplier
	if req.SupplierID != nil {
		supplierID := strings.TrimSpace(*req.SupplierID)
		if supplierID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "supplierId cannot be empty"})
			return
		}
		// Validate supplier exists and belongs to org
		if _, err := m.deps.Repo.GetSupplierByOrg(c.Request.Context(), orgID, supplierID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid supplierId"})
			return
		}
		patch["supplierId"] = supplierID
	}

	// Handle branch
	if req.BranchID != nil {
		branchID := strings.TrimSpace(*req.BranchID)
		if branchID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "branchId cannot be empty"})
			return
		}
		// Validate branch exists and belongs to org
		if _, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, branchID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid branchId"})
			return
		}
		patch["branchId"] = branchID
	}

	// Handle dates
	if req.OrderDate != nil {
		patch["date"] = *req.OrderDate
	}
	if req.ExpectedDeliveryDate != nil {
		patch["expectedDeliveryDate"] = *req.ExpectedDeliveryDate
	}

	// Handle financial fields
	if req.DiscountAmount != nil {
		patch["discountAmount"] = *req.DiscountAmount
	}
	if req.TaxRate != nil {
		patch["taxRate"] = *req.TaxRate
	}
	if req.ShippingCost != nil {
		patch["shippingCost"] = *req.ShippingCost
	}

	// Handle shipping and notes
	if req.ShippingChannel != nil {
		patch["shippingChannel"] = strings.TrimSpace(*req.ShippingChannel)
	}
	if req.InternalNotes != nil {
		patch["internalNotes"] = strings.TrimSpace(*req.InternalNotes)
	}

	// Handle items update
	if len(req.Items) > 0 {
		// Convert request items to model items and compute total
		var total int64
		modelItems := make([]models.PurchaseOrderItem, 0, len(req.Items))
		for i := range req.Items {
			productID := strings.TrimSpace(req.Items[i].ProductID)
			productName := strings.TrimSpace(req.Items[i].ProductName)
			productSku := strings.TrimSpace(req.Items[i].ProductSku)
			// Use qtyOrdered if set, otherwise use quantity
			qty := req.Items[i].QtyOrdered
			if qty <= 0 {
				qty = req.Items[i].Quantity
			}
			if productID == "" || qty <= 0 || req.Items[i].UnitCost < 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid items"})
				return
			}
			p, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, productID)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid productId", "productId": productID})
				return
			}
			if productName == "" {
				productName = p.Name
			}
			if productSku == "" {
				productSku = p.SKU
			}
			lineTotal := int64(qty) * req.Items[i].UnitCost
			if req.Items[i].Discount > 0 {
				lineTotal -= req.Items[i].Discount
			}
			total += lineTotal
			modelItems = append(modelItems, models.PurchaseOrderItem{
				ProductID:   productID,
				ProductName: productName,
				ProductSKU:  productSku,
				Quantity:    qty,
				UnitCost:    req.Items[i].UnitCost,
				Discount:    req.Items[i].Discount,
			})
		}
		patch["items"] = modelItems
		patch["totalCost"] = total
	}

	if len(patch) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no changes"})
		return
	}

	updated, err := m.deps.Repo.UpdatePurchaseOrderByOrg(c.Request.Context(), orgID, poID, patch)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
			return
		}
		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "referenceNo already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update purchase order"})
		return
	}

	// Get supplier and branch names for response
	supplierName := ""
	if supplier, err := m.deps.Repo.GetSupplierByOrg(c.Request.Context(), orgID, updated.SupplierID); err == nil {
		supplierName = supplier.Name
	}
	branchName := ""
	if branch, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, updated.BranchID); err == nil {
		branchName = branch.Name
	}

	c.JSON(http.StatusOK, gin.H{"data": m.poToResponse(updated, supplierName, branchName)})
}

func (m *Module) receive(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	poID := c.Param("id")
	po, err := m.deps.Repo.GetPurchaseOrderByOrg(c.Request.Context(), orgID, poID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
		return
	}
	// Allow receiving from both OPEN (draft) and SENT status
	if po.Status != "OPEN" && po.Status != "SENT" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "purchase order cannot be received in current status"})
		return
	}

	// Lock the PO to prevent double receive.
	lockRes, err := m.deps.Mongo.Collection(repo.ColPurchaseOrders).UpdateOne(
		c.Request.Context(),
		bson.M{"_id": po.ID, "orgId": orgID, "status": po.Status},
		bson.M{"$set": bson.M{"status": "RECEIVING", "updatedAt": time.Now().UTC()}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to lock purchase order"})
		return
	}
	if lockRes.MatchedCount == 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "purchase order cannot be received"})
		return
	}

	originalStatus := po.Status // Save for rollback

	// Ensure the branch still exists.
	if _, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, po.BranchID); err != nil {
		_, _ = m.deps.Mongo.Collection(repo.ColPurchaseOrders).UpdateOne(
			c.Request.Context(),
			bson.M{"_id": po.ID, "orgId": orgID},
			bson.M{"$set": bson.M{"status": originalStatus, "updatedAt": time.Now().UTC()}},
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid branchId"})
		return
	}

	// Validate products exist and belong to the org before adjusting stock.
	products := make(map[string]models.Product, len(po.Items))
	for _, item := range po.Items {
		p, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, strings.TrimSpace(item.ProductID))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid productId", "productId": item.ProductID})
			return
		}
		products[item.ProductID] = p
	}

	receivedAt := time.Now().UTC()

	type appliedLot struct {
		productID string
		qty       int
		lotID     string
	}
	applied := make([]appliedLot, 0, len(po.Items))

	rollback := func() {
		for _, a := range applied {
			_, _ = m.deps.Repo.AdjustStock(c.Request.Context(), orgID, po.BranchID, a.productID, -a.qty)
			_ = m.deps.Repo.DeleteInventoryLot(c.Request.Context(), a.lotID)
		}
		_, _ = m.deps.Mongo.Collection(repo.ColPurchaseOrders).UpdateOne(
			c.Request.Context(),
			bson.M{"_id": po.ID, "orgId": orgID},
			bson.M{"$set": bson.M{"status": "OPEN", "updatedAt": time.Now().UTC()}},
		)
	}

	// Apply stock changes.
	for _, item := range po.Items {
		// Create FIFO lot for this received quantity.
		lotID := primitive.NewObjectID().Hex()
		_, err := m.deps.Repo.CreateInventoryLot(c.Request.Context(), models.InventoryLot{
			ID:              lotID,
			OrgID:           orgID,
			BranchID:        po.BranchID,
			ProductID:       item.ProductID,
			Source:          "PO",
			PurchaseOrderID: po.ID,
			ReferenceNo:     po.ReferenceNo,
			UnitCost:        item.UnitCost,
			QtyReceived:     item.Quantity,
			QtyRemaining:    item.Quantity,
			ReceivedAt:      receivedAt,
		})
		if err != nil {
			rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create inventory lot"})
			return
		}

		_, err = m.deps.Repo.AdjustStock(c.Request.Context(), orgID, po.BranchID, item.ProductID, item.Quantity)
		if err != nil {
			_ = m.deps.Repo.DeleteInventoryLot(c.Request.Context(), lotID)
			rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update stock"})
			return
		}

		applied = append(applied, appliedLot{productID: item.ProductID, qty: item.Quantity, lotID: lotID})

		// Update product's last purchase cost for convenience (derived from PO).
		_, _ = m.deps.Repo.UpdateProductByOrg(c.Request.Context(), orgID, item.ProductID, bson.M{"cost": item.UnitCost})

		// Update moving average cost if product uses that costing method
		costingSvc := costing.New(m.deps.Repo)
		_ = costingSvc.UpdateMovingAverageOnReceive(c.Request.Context(), orgID, po.BranchID, item.ProductID, item.Quantity, item.UnitCost)
	}

	receivedDate := receivedAt.Format(time.RFC3339)
	updatedPO, err := m.deps.Repo.UpdatePurchaseOrderByOrg(c.Request.Context(), orgID, po.ID, bson.M{
		"status":       "RECEIVED",
		"receivedDate": receivedDate,
	})
	if err != nil {
		rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update purchase order"})
		return
	}

	// Create stock-in transaction.
	items := make([]models.TransactionItem, 0, len(po.Items))
	for _, item := range po.Items {
		prod, ok := products[item.ProductID]
		if !ok {
			continue
		}
		items = append(items, models.TransactionItem{
			ID:       prod.ID,
			SKU:      prod.SKU,
			Name:     prod.Name,
			Category: prod.Category,
			Image:    prod.Image,
			Price:    prod.Price,
			Cost:     item.UnitCost,
			LineCost: int64(item.Quantity) * item.UnitCost,
			Quantity: item.Quantity,
		})
	}
	txn := models.Transaction{
		ID:               "TXN-PO-" + primitive.NewObjectID().Hex(),
		OrgID:            orgID,
		BranchID:         po.BranchID,
		Date:             receivedDate,
		Channel:          "POS",
		Type:             "STOCK_IN",
		Status:           "COMPLETED",
		FulfillmentStatus: "DELIVERED",
		Items:            items,
		Total:            -po.TotalCost,
		UserID:           u.ID,
		RecipientName:    "Purchase Order",
		Note:             "Received PO: " + po.ReferenceNo,
		ReferenceID:      po.ID,
	}
	_, _ = m.deps.Repo.CreateTransaction(c.Request.Context(), txn)

	c.JSON(http.StatusOK, gin.H{"data": updatedPO})
}

func (m *Module) stats(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	pos, err := m.deps.Repo.ListPurchaseOrdersByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get stats"})
		return
	}

	var total, pending int
	var totalValue, unpaidValue int64
	for _, po := range pos {
		total++
		if po.Status == "OPEN" {
			pending++
			unpaidValue += po.TotalCost
		}
		totalValue += po.TotalCost
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"total":       total,
			"pending":     pending,
			"totalValue":  totalValue,
			"unpaidValue": unpaidValue,
		},
	})
}

func (m *Module) submit(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	po, err := m.deps.Repo.GetPurchaseOrderByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get purchase order"})
		return
	}

	// Only OPEN (displayed as DRAFT) orders can be submitted
	if po.Status != "OPEN" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only draft orders can be submitted"})
		return
	}

	// Update status to SENT (displayed as SENT in response)
	updated, err := m.deps.Repo.UpdatePurchaseOrderByOrg(c.Request.Context(), orgID, id, bson.M{
		"status": "SENT",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit purchase order"})
		return
	}

	// Get supplier and branch names
	supplierName := ""
	if supplier, err := m.deps.Repo.GetSupplierByOrg(c.Request.Context(), orgID, updated.SupplierID); err == nil {
		supplierName = supplier.Name
	}
	branchName := ""
	if branch, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, updated.BranchID); err == nil {
		branchName = branch.Name
	}

	c.JSON(http.StatusOK, gin.H{"data": m.poToResponse(updated, supplierName, branchName)})
}

func (m *Module) duplicate(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	po, err := m.deps.Repo.GetPurchaseOrderByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get purchase order"})
		return
	}

	// Generate new reference number
	seq, err := m.deps.Repo.NextCounter(c.Request.Context(), "po:"+orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate reference"})
		return
	}

	newPO := models.PurchaseOrder{
		ID:          "po-" + primitive.NewObjectID().Hex(),
		OrgID:       orgID,
		BranchID:    po.BranchID,
		ReferenceNo: repo.FormatPurchaseOrderReference(seq),
		Date:        time.Now().UTC().Format(time.RFC3339),
		SupplierID:  po.SupplierID,
		Status:      "OPEN",
		Items:       po.Items,
		TotalCost:   po.TotalCost,
		Note:        po.Note,
	}

	created, err := m.deps.Repo.CreatePurchaseOrder(c.Request.Context(), newPO)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to duplicate purchase order"})
		return
	}

	// Get supplier and branch names
	supplierName := ""
	if supplier, err := m.deps.Repo.GetSupplierByOrg(c.Request.Context(), orgID, created.SupplierID); err == nil {
		supplierName = supplier.Name
	}
	branchName := ""
	if branch, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, created.BranchID); err == nil {
		branchName = branch.Name
	}

	c.JSON(http.StatusCreated, gin.H{"data": m.poToResponse(created, supplierName, branchName)})
}

type recordPOPaymentRequest struct {
	Amount    int64  `json:"amount"`
	Method    string `json:"method"`
	Reference string `json:"reference"`
}

func (m *Module) recordPayment(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	var req recordPOPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	po, err := m.deps.Repo.GetPurchaseOrderByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get purchase order"})
		return
	}

	// Update paid amount
	newPaidAmount := po.PaidAmount + req.Amount
	patch := bson.M{
		"paidAmount": newPaidAmount,
		"updatedAt":  time.Now().UTC(),
	}

	updated, err := m.deps.Repo.UpdatePurchaseOrderByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record payment"})
		return
	}

	supplierName := ""
	if supplier, err := m.deps.Repo.GetSupplierByOrg(c.Request.Context(), orgID, updated.SupplierID); err == nil {
		supplierName = supplier.Name
	}
	branchName := ""
	if branch, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, updated.BranchID); err == nil {
		branchName = branch.Name
	}

	c.JSON(http.StatusOK, gin.H{"data": m.poToResponse(updated, supplierName, branchName)})
}

func (m *Module) updateStatus(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")

	var req struct {
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Map frontend status to backend status
	backendStatus := req.Status
	switch req.Status {
	case "DRAFT":
		backendStatus = "OPEN"
	case "PENDING":
		backendStatus = "RECEIVING"
	case "PARTIAL":
		backendStatus = "RECEIVING"
	}

	// Validate status transition
	validStatuses := map[string]bool{
		"OPEN": true, "RECEIVING": true, "RECEIVED": true, "CANCELLED": true,
	}
	if !validStatuses[backendStatus] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
		return
	}

	patch := bson.M{
		"status":    backendStatus,
		"updatedAt": time.Now().UTC(),
	}
	if req.Notes != "" {
		patch["internalNotes"] = req.Notes
	}

	updated, err := m.deps.Repo.UpdatePurchaseOrderByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update status"})
		return
	}

	supplierName := ""
	if supplier, err := m.deps.Repo.GetSupplierByOrg(c.Request.Context(), orgID, updated.SupplierID); err == nil {
		supplierName = supplier.Name
	}
	branchName := ""
	if branch, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, updated.BranchID); err == nil {
		branchName = branch.Name
	}

	c.JSON(http.StatusOK, gin.H{"data": m.poToResponse(updated, supplierName, branchName)})
}

func (m *Module) bulkUpdateStatus(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req struct {
		IDs    []string `json:"ids"`
		Status string   `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Map frontend status to backend status
	backendStatus := req.Status
	switch req.Status {
	case "DRAFT":
		backendStatus = "OPEN"
	case "PENDING":
		backendStatus = "RECEIVING"
	case "PARTIAL":
		backendStatus = "RECEIVING"
	}

	validStatuses := map[string]bool{
		"OPEN": true, "RECEIVING": true, "RECEIVED": true, "CANCELLED": true,
	}
	if !validStatuses[backendStatus] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status"})
		return
	}

	updated := 0
	for _, id := range req.IDs {
		patch := bson.M{
			"status":    backendStatus,
			"updatedAt": time.Now().UTC(),
		}
		_, err := m.deps.Repo.UpdatePurchaseOrderByOrg(c.Request.Context(), orgID, id, patch)
		if err == nil {
			updated++
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"updated": updated}})
}
