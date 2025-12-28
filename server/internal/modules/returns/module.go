package returnsmodule

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	"stockflows/server/internal/models"
	"stockflows/server/internal/repo"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/gin-gonic/gin"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "returns" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/returns")
	g.Use(auth.RequireUser())

	// List and stats
	g.GET("", m.list)
	g.GET("/next-reference", m.nextReference)

	// CRUD
	g.GET("/:id", m.get)
	g.POST("", m.create)
	g.PATCH("/:id", m.update)
	g.DELETE("/:id", m.delete)

	// Lifecycle actions (require manager+ roles)
	manager := auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager)
	g.POST("/:id/approve", manager, m.approve)
	g.POST("/:id/reject", manager, m.reject)
	g.POST("/:id/receive", manager, m.receive)  // For customer returns
	g.POST("/:id/ship", manager, m.ship)        // For supplier returns
	g.POST("/:id/complete", manager, m.complete)
	g.POST("/:id/cancel", manager, m.cancel)

	// Lookup returns by original document
	g.GET("/by-order/:orderId", m.listByOrder)
	g.GET("/by-po/:poId", m.listByPO)
}

func (m *Module) list(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	// Parse query params
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	filter := bson.M{}
	if t := c.Query("type"); t != "" {
		filter["type"] = strings.ToUpper(t)
	}
	if s := c.Query("status"); s != "" {
		filter["status"] = strings.ToUpper(s)
	}
	if branchID := c.Query("branchId"); branchID != "" {
		filter["branchId"] = branchID
	}

	returns, total, err := m.deps.Repo.ListReturnsByOrg(c.Request.Context(), orgID, filter, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list returns"})
		return
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, gin.H{
		"data": returns,
		"meta": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

func (m *Module) nextReference(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	seq, err := m.deps.Repo.PeekCounter(c.Request.Context(), "rma:"+orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get next reference"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"nextReference": repo.FormatReturnReference(seq + 1)})
}

func (m *Module) get(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	ret, err := m.deps.Repo.GetReturnByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "return not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get return"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": ret})
}

type createReturnRequest struct {
	Type            string             `json:"type"`                      // CUSTOMER or SUPPLIER
	OriginalOrderID string             `json:"originalOrderId,omitempty"` // For customer returns
	OriginalPOID    string             `json:"originalPurchaseOrderId,omitempty"` // For supplier returns
	Items           []createReturnItem `json:"items"`
	Resolution      string             `json:"resolution,omitempty"`
	RequestReason   string             `json:"requestReason,omitempty"`
}

type createReturnItem struct {
	ProductID   string `json:"productId"`
	Quantity    int    `json:"quantity"`
	Reason      string `json:"reason"`
	Condition   string `json:"condition,omitempty"`
	Notes       string `json:"notes,omitempty"`
	Restockable bool   `json:"restockable"`
}

func (m *Module) create(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	branchID := auth.GetBranchIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req createReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	// Validate return type
	returnType := models.ReturnType(strings.ToUpper(req.Type))
	if returnType != models.ReturnTypeCustomer && returnType != models.ReturnTypeSupplier {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be CUSTOMER or SUPPLIER"})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "items are required"})
		return
	}

	// Build return
	ret := models.Return{
		ID:          "rma-" + primitive.NewObjectID().Hex(),
		OrgID:       orgID,
		BranchID:    branchID,
		Type:        returnType,
		Status:      models.ReturnStatusRequested,
		RequestedBy: u.ID,
		Resolution:  models.ReturnResolution(strings.ToUpper(req.Resolution)),
		RequestReason: strings.TrimSpace(req.RequestReason),
	}

	ctx := c.Request.Context()

	if returnType == models.ReturnTypeCustomer {
		// Validate original order exists and is delivered
		if req.OriginalOrderID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "originalOrderId is required for customer returns"})
			return
		}
		txn, err := m.deps.Repo.GetTransactionByOrg(ctx, orgID, req.OriginalOrderID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "original order not found"})
			return
		}
		if txn.FulfillmentStatus != "DELIVERED" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "can only return delivered orders"})
			return
		}

		ret.OriginalOrderID = txn.ID
		ret.OriginalRefNo = txn.ID
		ret.CustomerID = txn.CustomerID
		ret.CustomerName = txn.RecipientName
		ret.CustomerPhone = txn.RecipientPhone
		if ret.BranchID == "" {
			ret.BranchID = txn.BranchID
		}

		// Build items from request with validation
		items := make([]models.ReturnItem, 0, len(req.Items))
		var totalValue int64
		for _, ri := range req.Items {
			// Find item in original order
			var found *models.TransactionItem
			for _, ti := range txn.Items {
				if ti.ID == ri.ProductID {
					found = &ti
					break
				}
			}
			if found == nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "product not in original order", "productId": ri.ProductID})
				return
			}
			if ri.Quantity > found.Quantity {
				c.JSON(http.StatusBadRequest, gin.H{"error": "return quantity exceeds order quantity", "productId": ri.ProductID})
				return
			}

			item := models.ReturnItem{
				ProductID:   ri.ProductID,
				ProductName: found.Name,
				ProductSKU:  found.SKU,
				Quantity:    ri.Quantity,
				UnitCost:    found.Cost,
				UnitPrice:   found.Price,
				Reason:      models.ReturnReason(strings.ToUpper(ri.Reason)),
				Condition:   models.ItemCondition(strings.ToUpper(ri.Condition)),
				Notes:       strings.TrimSpace(ri.Notes),
				Restockable: ri.Restockable,
			}
			items = append(items, item)
			totalValue += int64(ri.Quantity) * found.Price
		}
		ret.Items = items
		ret.TotalValue = totalValue

	} else {
		// Supplier return - validate PO exists and is received
		if req.OriginalPOID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "originalPurchaseOrderId is required for supplier returns"})
			return
		}
		po, err := m.deps.Repo.GetPurchaseOrderByOrg(ctx, orgID, req.OriginalPOID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "original purchase order not found"})
			return
		}
		if po.Status != "RECEIVED" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "can only return received purchase orders"})
			return
		}

		// Get supplier info
		supplier, _ := m.deps.Repo.GetSupplierByOrg(ctx, orgID, po.SupplierID)

		ret.OriginalPOID = po.ID
		ret.OriginalRefNo = po.ReferenceNo
		ret.SupplierID = po.SupplierID
		ret.SupplierName = supplier.Name
		if ret.BranchID == "" {
			ret.BranchID = po.BranchID
		}

		// Build items from request with validation
		items := make([]models.ReturnItem, 0, len(req.Items))
		var totalValue int64
		for _, ri := range req.Items {
			// Find item in original PO
			var found *models.PurchaseOrderItem
			for i := range po.Items {
				if po.Items[i].ProductID == ri.ProductID {
					found = &po.Items[i]
					break
				}
			}
			if found == nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "product not in original PO", "productId": ri.ProductID})
				return
			}
			if ri.Quantity > found.Quantity {
				c.JSON(http.StatusBadRequest, gin.H{"error": "return quantity exceeds PO quantity", "productId": ri.ProductID})
				return
			}

			item := models.ReturnItem{
				ProductID:   ri.ProductID,
				ProductName: found.ProductName,
				ProductSKU:  found.ProductSKU,
				Quantity:    ri.Quantity,
				UnitCost:    found.UnitCost,
				Reason:      models.ReturnReason(strings.ToUpper(ri.Reason)),
				Condition:   models.ItemCondition(strings.ToUpper(ri.Condition)),
				Notes:       strings.TrimSpace(ri.Notes),
				Restockable: ri.Restockable,
			}
			items = append(items, item)
			totalValue += int64(ri.Quantity) * found.UnitCost
		}
		ret.Items = items
		ret.TotalValue = totalValue
		ret.CreditAmount = totalValue // Expected credit from supplier
	}

	// Generate reference number
	seq, err := m.deps.Repo.NextCounter(ctx, "rma:"+orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate reference"})
		return
	}
	ret.ReferenceNo = repo.FormatReturnReference(seq)

	created, err := m.deps.Repo.CreateReturn(ctx, ret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create return"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

type updateReturnRequest struct {
	Items         *[]createReturnItem `json:"items,omitempty"`
	Resolution    *string             `json:"resolution,omitempty"`
	RequestReason *string             `json:"requestReason,omitempty"`
	InternalNotes *string             `json:"internalNotes,omitempty"`
}

func (m *Module) update(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	ret, err := m.deps.Repo.GetReturnByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "return not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get return"})
		return
	}

	// Only allow updates in REQUESTED status
	if ret.Status != models.ReturnStatusRequested {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only update returns in REQUESTED status"})
		return
	}

	var req updateReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	patch := bson.M{}
	if req.Resolution != nil {
		patch["resolution"] = strings.ToUpper(*req.Resolution)
	}
	if req.RequestReason != nil {
		patch["requestReason"] = strings.TrimSpace(*req.RequestReason)
	}
	if req.InternalNotes != nil {
		patch["internalNotes"] = strings.TrimSpace(*req.InternalNotes)
	}

	if len(patch) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no changes"})
		return
	}

	updated, err := m.deps.Repo.UpdateReturnByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update return"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (m *Module) delete(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	ret, err := m.deps.Repo.GetReturnByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "return not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get return"})
		return
	}

	// Only allow deletion in REQUESTED status
	if ret.Status != models.ReturnStatusRequested {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only delete returns in REQUESTED status"})
		return
	}

	if err := m.deps.Repo.DeleteReturnByOrg(c.Request.Context(), orgID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete return"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "return deleted"})
}

type approveRejectRequest struct {
	Notes string `json:"notes,omitempty"`
}

func (m *Module) approve(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	ret, err := m.deps.Repo.GetReturnByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "return not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get return"})
		return
	}

	if ret.Status != models.ReturnStatusRequested {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only approve REQUESTED returns"})
		return
	}

	var req approveRejectRequest
	_ = c.ShouldBindJSON(&req)

	patch := bson.M{
		"status":     models.ReturnStatusApproved,
		"approvedBy": u.ID,
		"approvedAt": time.Now().UTC(),
	}
	if req.Notes != "" {
		patch["approvalNotes"] = strings.TrimSpace(req.Notes)
	}

	updated, err := m.deps.Repo.UpdateReturnByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to approve return"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (m *Module) reject(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	ret, err := m.deps.Repo.GetReturnByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "return not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get return"})
		return
	}

	if ret.Status != models.ReturnStatusRequested {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only reject REQUESTED returns"})
		return
	}

	var req approveRejectRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Notes) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "rejection reason is required"})
		return
	}

	patch := bson.M{
		"status":          models.ReturnStatusRejected,
		"rejectionReason": strings.TrimSpace(req.Notes),
	}

	updated, err := m.deps.Repo.UpdateReturnByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reject return"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

type receiveReturnRequest struct {
	Items []receiveReturnItem `json:"items"`
	Notes string              `json:"notes,omitempty"`
}

type receiveReturnItem struct {
	ProductID   string `json:"productId"`
	QtyReceived int    `json:"qtyReceived"`
	Condition   string `json:"condition"`
	Restockable bool   `json:"restockable"`
}

func (m *Module) receive(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	ctx := c.Request.Context()

	ret, err := m.deps.Repo.GetReturnByOrg(ctx, orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "return not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get return"})
		return
	}

	// Must be customer return and APPROVED status
	if ret.Type != models.ReturnTypeCustomer {
		c.JSON(http.StatusBadRequest, gin.H{"error": "receive action is only for customer returns"})
		return
	}
	if ret.Status != models.ReturnStatusApproved {
		c.JSON(http.StatusBadRequest, gin.H{"error": "return must be approved before receiving"})
		return
	}

	var req receiveReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	// Process each returned item
	updatedItems := ret.Items
	receivedAt := time.Now().UTC()

	for _, ri := range req.Items {
		for idx, item := range updatedItems {
			if item.ProductID == ri.ProductID {
				updatedItems[idx].QtyReceived = ri.QtyReceived
				updatedItems[idx].Condition = models.ItemCondition(strings.ToUpper(ri.Condition))
				updatedItems[idx].Restockable = ri.Restockable

				// If restockable, create inventory lot and adjust stock
				if ri.Restockable && ri.QtyReceived > 0 {
					lotID := "lot-" + primitive.NewObjectID().Hex()
					_, err := m.deps.Repo.CreateInventoryLot(ctx, models.InventoryLot{
						ID:          lotID,
						OrgID:       orgID,
						BranchID:    ret.BranchID,
						ProductID:   ri.ProductID,
						Source:      "RETURN",
						ReferenceNo: ret.ReferenceNo,
						UnitCost:    item.UnitCost,
						QtyReceived: ri.QtyReceived,
						QtyRemaining: ri.QtyReceived,
						ReceivedAt:  receivedAt,
					})
					if err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create lot"})
						return
					}

					// Increment stock level
					_, err = m.deps.Repo.AdjustStock(ctx, orgID, ret.BranchID, ri.ProductID, ri.QtyReceived)
					if err != nil {
						// Rollback lot creation
						_ = m.deps.Repo.DeleteInventoryLot(ctx, lotID)
						c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to adjust stock"})
						return
					}

					updatedItems[idx].LotID = lotID
				}
				break
			}
		}
	}

	// Update return status
	patch := bson.M{
		"status":     models.ReturnStatusReceived,
		"items":      updatedItems,
		"receivedBy": u.ID,
		"receivedAt": receivedAt,
	}
	if req.Notes != "" {
		patch["internalNotes"] = strings.TrimSpace(req.Notes)
	}

	updated, err := m.deps.Repo.UpdateReturnByOrg(ctx, orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update return"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

type shipReturnRequest struct {
	Carrier        string `json:"carrier,omitempty"`
	TrackingNumber string `json:"trackingNumber,omitempty"`
	Notes          string `json:"notes,omitempty"`
}

func (m *Module) ship(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	ctx := c.Request.Context()

	ret, err := m.deps.Repo.GetReturnByOrg(ctx, orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "return not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get return"})
		return
	}

	if ret.Type != models.ReturnTypeSupplier {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ship action is only for supplier returns"})
		return
	}
	if ret.Status != models.ReturnStatusApproved {
		c.JSON(http.StatusBadRequest, gin.H{"error": "return must be approved before shipping"})
		return
	}

	var req shipReturnRequest
	_ = c.ShouldBindJSON(&req)

	shippedAt := time.Now().UTC()

	// Deduct stock for each item
	for _, item := range ret.Items {
		if item.Quantity <= 0 {
			continue
		}

		// Deduct from stock
		_, err := m.deps.Repo.AdjustStock(ctx, orgID, ret.BranchID, item.ProductID, -item.Quantity)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to deduct stock", "productId": item.ProductID})
			return
		}

		// Consume from FIFO lots
		_, _, _ = m.deps.Repo.ConsumeLotsFIFO(ctx, orgID, ret.BranchID, item.ProductID, item.Quantity)
	}

	// Update return with shipping info
	shipping := &models.ShippingInfo{
		Carrier:        req.Carrier,
		TrackingNumber: req.TrackingNumber,
		ShippedDate:    shippedAt.Format(time.RFC3339),
	}

	patch := bson.M{
		"status":       models.ReturnStatusShipped,
		"shippingInfo": shipping,
		"shippedAt":    shippedAt,
	}
	if req.Notes != "" {
		patch["internalNotes"] = req.Notes
	}

	updated, err := m.deps.Repo.UpdateReturnByOrg(ctx, orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update return"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

type completeReturnRequest struct {
	RefundAmount   *int64 `json:"refundAmount,omitempty"`
	CreditReceived *int64 `json:"creditReceived,omitempty"`
	Notes          string `json:"notes,omitempty"`
}

func (m *Module) complete(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	ret, err := m.deps.Repo.GetReturnByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "return not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get return"})
		return
	}

	// Must be in RECEIVED (customer) or SHIPPED (supplier) status
	if ret.Type == models.ReturnTypeCustomer && ret.Status != models.ReturnStatusReceived {
		c.JSON(http.StatusBadRequest, gin.H{"error": "customer return must be received before completing"})
		return
	}
	if ret.Type == models.ReturnTypeSupplier && ret.Status != models.ReturnStatusShipped {
		c.JSON(http.StatusBadRequest, gin.H{"error": "supplier return must be shipped before completing"})
		return
	}

	var req completeReturnRequest
	_ = c.ShouldBindJSON(&req)

	patch := bson.M{
		"status":      models.ReturnStatusCompleted,
		"completedBy": u.ID,
		"completedAt": time.Now().UTC(),
	}
	if req.RefundAmount != nil {
		patch["refundAmount"] = *req.RefundAmount
	}
	if req.CreditReceived != nil {
		patch["creditReceived"] = *req.CreditReceived
	}
	if req.Notes != "" {
		patch["internalNotes"] = strings.TrimSpace(req.Notes)
	}

	updated, err := m.deps.Repo.UpdateReturnByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete return"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

type cancelReturnRequest struct {
	Reason string `json:"reason"`
}

func (m *Module) cancel(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	ret, err := m.deps.Repo.GetReturnByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "return not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get return"})
		return
	}

	// Cannot cancel completed returns
	if ret.Status == models.ReturnStatusCompleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot cancel completed returns"})
		return
	}

	var req cancelReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Reason) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cancellation reason is required"})
		return
	}

	patch := bson.M{
		"status":          models.ReturnStatusCancelled,
		"rejectionReason": strings.TrimSpace(req.Reason),
	}

	updated, err := m.deps.Repo.UpdateReturnByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to cancel return"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (m *Module) listByOrder(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	orderID := c.Param("orderId")
	returns, err := m.deps.Repo.ListReturnsByOriginalOrder(c.Request.Context(), orgID, orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list returns"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": returns})
}

func (m *Module) listByPO(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	poID := c.Param("poId")
	returns, err := m.deps.Repo.ListReturnsByOriginalPO(c.Request.Context(), orgID, poID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list returns"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": returns})
}
