package stockmodule

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ============================================================================
// Stock Levels
// ============================================================================

func (m *Module) listInventoryStockLevels(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	all, err := m.deps.Repo.ListStockLevelsByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list stock"})
		return
	}

	// Enrich with product info
	products, _ := m.deps.Repo.ListProductsByOrg(c.Request.Context(), orgID)
	productMap := make(map[string]models.Product)
	for _, p := range products {
		productMap[p.ID] = p
	}

	branchID := strings.TrimSpace(c.Query("branchId"))
	productID := strings.TrimSpace(c.Query("productId"))
	lowStockOnly := c.Query("lowStockOnly") == "true"
	outOfStockOnly := c.Query("outOfStockOnly") == "true"

	type enrichedStock struct {
		models.StockLevel
		ProductName       string `json:"productName"`
		ProductSku        string `json:"productSku"`
		AvailableQuantity int    `json:"availableQuantity"`
		IsLowStock        bool   `json:"isLowStock"`
		IsOutOfStock      bool   `json:"isOutOfStock"`
	}

	result := make([]enrichedStock, 0, len(all))
	for _, s := range all {
		if branchID != "" && s.BranchID != branchID {
			continue
		}
		if productID != "" && s.ProductID != productID {
			continue
		}

		available := s.Quantity - s.Reserved
		isLow := s.Quantity > 0 && s.Quantity <= s.MinStock
		isOut := s.Quantity <= 0

		if lowStockOnly && !isLow {
			continue
		}
		if outOfStockOnly && !isOut {
			continue
		}

		es := enrichedStock{
			StockLevel:        s,
			AvailableQuantity: available,
			IsLowStock:        isLow,
			IsOutOfStock:      isOut,
		}
		if p, ok := productMap[s.ProductID]; ok {
			es.ProductName = p.Name
			es.ProductSku = p.SKU
		}
		result = append(result, es)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
		"meta": gin.H{
			"page":       1,
			"limit":      len(result),
			"total":      len(result),
			"totalPages": 1,
		},
	})
}

func (m *Module) getInventoryStockLevel(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	productID := c.Param("productId")
	branchID := c.Query("branchId")
	if branchID == "" {
		branchID = auth.GetBranchIDForRequest(c, u)
	}

	stock, err := m.deps.Repo.GetStockLevel(c.Request.Context(), orgID, branchID, productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "stock level not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": stock})
}

func (m *Module) getLowStock(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	all, err := m.deps.Repo.ListStockLevelsByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list stock"})
		return
	}

	branchID := c.Query("branchId")
	result := make([]models.StockLevel, 0)
	for _, s := range all {
		if branchID != "" && s.BranchID != branchID {
			continue
		}
		if s.Quantity > 0 && s.Quantity <= s.MinStock {
			result = append(result, s)
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (m *Module) getOutOfStock(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	all, err := m.deps.Repo.ListStockLevelsByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list stock"})
		return
	}

	branchID := c.Query("branchId")
	result := make([]models.StockLevel, 0)
	for _, s := range all {
		if branchID != "" && s.BranchID != branchID {
			continue
		}
		if s.Quantity <= 0 {
			result = append(result, s)
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (m *Module) getProductStock(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	productID := c.Param("productId")
	all, err := m.deps.Repo.ListStockLevelsByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list stock"})
		return
	}

	result := make([]models.StockLevel, 0)
	for _, s := range all {
		if s.ProductID == productID {
			result = append(result, s)
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// ============================================================================
// Movements
// ============================================================================

func (m *Module) listMovements(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	filter := bson.M{}
	if branchID := c.Query("branchId"); branchID != "" {
		filter["branchId"] = branchID
	}
	if productID := c.Query("productId"); productID != "" {
		filter["productId"] = productID
	}
	if mvType := c.Query("type"); mvType != "" {
		filter["type"] = mvType
	}

	movements, total, err := m.deps.Repo.ListStockMovementsByOrg(c.Request.Context(), orgID, filter, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list movements"})
		return
	}

	totalPages := (int(total) + limit - 1) / limit
	c.JSON(http.StatusOK, gin.H{
		"data": movements,
		"meta": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

func (m *Module) getMovement(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	movement, err := m.deps.Repo.GetStockMovement(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "movement not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": movement})
}

func (m *Module) getProductMovements(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	productID := c.Param("productId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	filter := bson.M{}
	if branchID := c.Query("branchId"); branchID != "" {
		filter["branchId"] = branchID
	}

	movements, total, err := m.deps.Repo.ListProductMovements(c.Request.Context(), orgID, productID, filter, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list movements"})
		return
	}

	totalPages := (int(total) + limit - 1) / limit
	c.JSON(http.StatusOK, gin.H{
		"data": movements,
		"meta": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

// ============================================================================
// Adjustments
// ============================================================================

type adjustmentRequest struct {
	ProductID string `json:"productId"`
	BranchID  string `json:"branchId"`
	Type      string `json:"type"` // ADD, REMOVE, SET
	Quantity  int    `json:"quantity"`
	Reason    string `json:"reason"`
	Notes     string `json:"notes"`
	LotID     string `json:"lotId"`
	UnitCost  int64  `json:"unitCost"`
}

func (m *Module) createAdjustment(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	branchID := auth.GetBranchIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req adjustmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	if req.BranchID != "" {
		branchID = req.BranchID
	}
	if branchID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "branchId required"})
		return
	}

	// Get current stock
	currentStock, _ := m.deps.Repo.GetStockLevel(c.Request.Context(), orgID, branchID, req.ProductID)
	prevQty := currentStock.Quantity

	// Calculate delta
	var delta int
	movementType := "ADJUSTMENT_IN"
	switch strings.ToUpper(req.Type) {
	case "ADD":
		delta = req.Quantity
		movementType = "ADJUSTMENT_IN"
	case "REMOVE":
		delta = -req.Quantity
		movementType = "ADJUSTMENT_OUT"
	case "SET":
		delta = req.Quantity - prevQty
		if delta < 0 {
			movementType = "ADJUSTMENT_OUT"
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid type"})
		return
	}

	// Apply adjustment
	newStock, err := m.deps.Repo.AdjustStock(c.Request.Context(), orgID, branchID, req.ProductID, delta)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to adjust stock"})
		return
	}

	// Create movement record
	movement := models.StockMovement{
		ID:               "MV-" + primitive.NewObjectID().Hex(),
		OrgID:            orgID,
		BranchID:         branchID,
		ProductID:        req.ProductID,
		Type:             movementType,
		Quantity:         abs(delta),
		PreviousQuantity: prevQty,
		NewQuantity:      newStock.Quantity,
		UnitCost:         req.UnitCost,
		TotalCost:        req.UnitCost * int64(abs(delta)),
		ReferenceType:    "ADJUSTMENT",
		LotID:            req.LotID,
		Reason:           req.Reason,
		Notes:            req.Notes,
		CreatedBy:        u.ID,
	}
	m.deps.Repo.CreateStockMovement(c.Request.Context(), movement)

	c.JSON(http.StatusOK, gin.H{"data": movement})
}

type bulkAdjustmentRequest struct {
	BranchID string `json:"branchId"`
	Reason   string `json:"reason"`
	Notes    string `json:"notes"`
	Items    []struct {
		ProductID string `json:"productId"`
		Type      string `json:"type"`
		Quantity  int    `json:"quantity"`
		LotID     string `json:"lotId"`
		UnitCost  int64  `json:"unitCost"`
	} `json:"items"`
}

func (m *Module) bulkAdjustment(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	branchID := auth.GetBranchIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req bulkAdjustmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	if req.BranchID != "" {
		branchID = req.BranchID
	}
	if branchID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "branchId required"})
		return
	}

	movements := make([]models.StockMovement, 0, len(req.Items))
	for _, item := range req.Items {
		currentStock, _ := m.deps.Repo.GetStockLevel(c.Request.Context(), orgID, branchID, item.ProductID)
		prevQty := currentStock.Quantity

		var delta int
		movementType := "ADJUSTMENT_IN"
		switch strings.ToUpper(item.Type) {
		case "ADD":
			delta = item.Quantity
		case "REMOVE":
			delta = -item.Quantity
			movementType = "ADJUSTMENT_OUT"
		case "SET":
			delta = item.Quantity - prevQty
			if delta < 0 {
				movementType = "ADJUSTMENT_OUT"
			}
		}

		newStock, err := m.deps.Repo.AdjustStock(c.Request.Context(), orgID, branchID, item.ProductID, delta)
		if err != nil {
			continue
		}

		movement := models.StockMovement{
			ID:               "MV-" + primitive.NewObjectID().Hex(),
			OrgID:            orgID,
			BranchID:         branchID,
			ProductID:        item.ProductID,
			Type:             movementType,
			Quantity:         abs(delta),
			PreviousQuantity: prevQty,
			NewQuantity:      newStock.Quantity,
			UnitCost:         item.UnitCost,
			TotalCost:        item.UnitCost * int64(abs(delta)),
			ReferenceType:    "ADJUSTMENT",
			LotID:            item.LotID,
			Reason:           req.Reason,
			Notes:            req.Notes,
			CreatedBy:        u.ID,
		}
		m.deps.Repo.CreateStockMovement(c.Request.Context(), movement)
		movements = append(movements, movement)
	}

	c.JSON(http.StatusOK, gin.H{"data": movements})
}

// ============================================================================
// Lots
// ============================================================================

func (m *Module) listLots(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	filter := bson.M{}
	if branchID := c.Query("branchId"); branchID != "" {
		filter["branchId"] = branchID
	}
	if productID := c.Query("productId"); productID != "" {
		filter["productId"] = productID
	}
	if status := c.Query("status"); status != "" {
		// Map status to qtyRemaining condition
		switch status {
		case "ACTIVE":
			filter["qtyRemaining"] = bson.M{"$gt": 0}
		case "DEPLETED":
			filter["qtyRemaining"] = bson.M{"$lte": 0}
		}
	}

	lots, total, err := m.deps.Repo.ListInventoryLotsByOrg(c.Request.Context(), orgID, filter, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list lots"})
		return
	}

	totalPages := (int(total) + limit - 1) / limit
	c.JSON(http.StatusOK, gin.H{
		"data": lots,
		"meta": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

func (m *Module) getLot(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	lot, err := m.deps.Repo.GetInventoryLot(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "lot not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": lot})
}

type createLotRequest struct {
	ProductID       string    `json:"productId"`
	BranchID        string    `json:"branchId"`
	Quantity        int       `json:"quantity"`
	UnitCost        int64     `json:"unitCost"`
	ReceivedDate    string    `json:"receivedDate"`
	PurchaseOrderID string    `json:"purchaseOrderId"`
	Notes           string    `json:"notes"`
}

func (m *Module) createLot(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	branchID := auth.GetBranchIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req createLotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	if req.BranchID != "" {
		branchID = req.BranchID
	}

	receivedAt := time.Now().UTC()
	if req.ReceivedDate != "" {
		if t, err := time.Parse(time.RFC3339, req.ReceivedDate); err == nil {
			receivedAt = t
		}
	}

	lot := models.InventoryLot{
		ID:              "LOT-" + primitive.NewObjectID().Hex(),
		OrgID:           orgID,
		BranchID:        branchID,
		ProductID:       req.ProductID,
		Source:          "MANUAL",
		PurchaseOrderID: req.PurchaseOrderID,
		UnitCost:        req.UnitCost,
		QtyReceived:     req.Quantity,
		QtyRemaining:    req.Quantity,
		ReceivedAt:      receivedAt,
	}

	created, err := m.deps.Repo.CreateInventoryLot(c.Request.Context(), lot)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create lot"})
		return
	}

	// Also adjust stock level
	m.deps.Repo.AdjustStock(c.Request.Context(), orgID, branchID, req.ProductID, req.Quantity)

	c.JSON(http.StatusOK, gin.H{"data": created})
}

func (m *Module) updateLot(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	patch := bson.M{}
	if notes, ok := req["notes"].(string); ok {
		patch["notes"] = notes
	}

	if len(patch) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no changes"})
		return
	}

	updated, err := m.deps.Repo.UpdateInventoryLot(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update lot"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (m *Module) getProductLots(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	productID := c.Param("productId")
	branchID := c.Query("branchId")

	lots, err := m.deps.Repo.ListProductLots(c.Request.Context(), orgID, productID, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list lots"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": lots})
}

func (m *Module) setReorderPoint(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	productID := c.Param("productId")
	var req struct {
		BranchID     string `json:"branchId"`
		ReorderPoint int    `json:"reorderPoint"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	branchID := req.BranchID
	if branchID == "" {
		branchID = auth.GetBranchIDForRequest(c, u)
	}

	// Ensure stock doc exists
	m.deps.Repo.AdjustStock(c.Request.Context(), orgID, branchID, productID, 0)

	patch := bson.M{"minStock": req.ReorderPoint}
	updated, err := m.deps.Repo.PatchStockLevel(c.Request.Context(), orgID, branchID, productID, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update reorder point"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// ============================================================================
// Transfers
// ============================================================================

func (m *Module) listTransfers(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	filter := bson.M{}
	if status := c.Query("status"); status != "" {
		filter["status"] = status
	}

	transfers, total, err := m.deps.Repo.ListStockTransfersByOrg(c.Request.Context(), orgID, filter, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list transfers"})
		return
	}

	totalPages := (int(total) + limit - 1) / limit
	c.JSON(http.StatusOK, gin.H{
		"data": transfers,
		"meta": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

func (m *Module) getTransfer(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	transfer, err := m.deps.Repo.GetStockTransfer(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "transfer not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": transfer})
}

type createTransferRequest struct {
	FromBranchID string `json:"fromBranchId"`
	ToBranchID   string `json:"toBranchId"`
	Notes        string `json:"notes"`
	Items        []struct {
		ProductID string `json:"productId"`
		Quantity  int    `json:"quantity"`
		LotID     string `json:"lotId"`
	} `json:"items"`
}

func (m *Module) createTransfer(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req createTransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	if req.FromBranchID == "" || req.ToBranchID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "fromBranchId and toBranchId required"})
		return
	}
	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "items required"})
		return
	}

	// Get next transfer number
	nextNum, _ := m.deps.Repo.NextCounter(c.Request.Context(), orgID+":transfer")
	transferNumber := "TRF-" + padNumber(nextNum, 6)

	// Build items with product info
	items := make([]models.StockTransferItem, 0, len(req.Items))
	for _, item := range req.Items {
		product, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, item.ProductID)
		if err != nil {
			continue
		}
		items = append(items, models.StockTransferItem{
			ProductID:   item.ProductID,
			ProductName: product.Name,
			ProductSKU:  product.SKU,
			Quantity:    item.Quantity,
			LotID:       item.LotID,
		})
	}

	transfer := models.StockTransfer{
		ID:             "TRF-" + primitive.NewObjectID().Hex(),
		OrgID:          orgID,
		TransferNumber: transferNumber,
		FromBranchID:   req.FromBranchID,
		ToBranchID:     req.ToBranchID,
		Status:         "DRAFT",
		Items:          items,
		Notes:          req.Notes,
		CreatedBy:      u.ID,
	}

	created, err := m.deps.Repo.CreateStockTransfer(c.Request.Context(), transfer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create transfer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": created})
}

func (m *Module) updateTransfer(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")

	// Check current status
	transfer, err := m.deps.Repo.GetStockTransfer(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "transfer not found"})
		return
	}
	if transfer.Status != "DRAFT" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only update draft transfers"})
		return
	}

	var req createTransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	patch := bson.M{}
	if req.Notes != "" {
		patch["notes"] = req.Notes
	}
	if len(req.Items) > 0 {
		items := make([]models.StockTransferItem, 0, len(req.Items))
		for _, item := range req.Items {
			product, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, item.ProductID)
			if err != nil {
				continue
			}
			items = append(items, models.StockTransferItem{
				ProductID:   item.ProductID,
				ProductName: product.Name,
				ProductSKU:  product.SKU,
				Quantity:    item.Quantity,
				LotID:       item.LotID,
			})
		}
		patch["items"] = items
	}

	updated, err := m.deps.Repo.UpdateStockTransfer(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update transfer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (m *Module) sendTransfer(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	transfer, err := m.deps.Repo.GetStockTransfer(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "transfer not found"})
		return
	}

	if transfer.Status != "DRAFT" && transfer.Status != "PENDING" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "transfer cannot be sent"})
		return
	}

	// Deduct stock from source branch
	for _, item := range transfer.Items {
		currentStock, _ := m.deps.Repo.GetStockLevel(c.Request.Context(), orgID, transfer.FromBranchID, item.ProductID)
		prevQty := currentStock.Quantity

		newStock, err := m.deps.Repo.AdjustStock(c.Request.Context(), orgID, transfer.FromBranchID, item.ProductID, -item.Quantity)
		if err != nil {
			continue
		}

		// Record movement
		movement := models.StockMovement{
			ID:               "MV-" + primitive.NewObjectID().Hex(),
			OrgID:            orgID,
			BranchID:         transfer.FromBranchID,
			ProductID:        item.ProductID,
			Type:             "TRANSFER_OUT",
			Quantity:         item.Quantity,
			PreviousQuantity: prevQty,
			NewQuantity:      newStock.Quantity,
			ReferenceType:    "TRANSFER",
			ReferenceID:      transfer.ID,
			ReferenceNumber:  transfer.TransferNumber,
			CreatedBy:        u.ID,
		}
		m.deps.Repo.CreateStockMovement(c.Request.Context(), movement)
	}

	// Update transfer status
	patch := bson.M{
		"status": "IN_TRANSIT",
		"sentAt": time.Now().UTC(),
	}
	updated, err := m.deps.Repo.UpdateStockTransfer(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update transfer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (m *Module) receiveTransfer(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	transfer, err := m.deps.Repo.GetStockTransfer(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "transfer not found"})
		return
	}

	if transfer.Status != "IN_TRANSIT" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "transfer cannot be received"})
		return
	}

	var req struct {
		Items []struct {
			ProductID        string `json:"productId"`
			ReceivedQuantity int    `json:"receivedQuantity"`
		} `json:"items"`
	}
	c.ShouldBindJSON(&req)

	// Map received quantities
	receivedMap := make(map[string]int)
	for _, item := range req.Items {
		receivedMap[item.ProductID] = item.ReceivedQuantity
	}

	// Add stock to destination branch
	updatedItems := make([]models.StockTransferItem, len(transfer.Items))
	for i, item := range transfer.Items {
		receivedQty := item.Quantity
		if rq, ok := receivedMap[item.ProductID]; ok {
			receivedQty = rq
		}

		currentStock, _ := m.deps.Repo.GetStockLevel(c.Request.Context(), orgID, transfer.ToBranchID, item.ProductID)
		prevQty := currentStock.Quantity

		newStock, err := m.deps.Repo.AdjustStock(c.Request.Context(), orgID, transfer.ToBranchID, item.ProductID, receivedQty)
		if err != nil {
			continue
		}

		// Record movement
		movement := models.StockMovement{
			ID:               "MV-" + primitive.NewObjectID().Hex(),
			OrgID:            orgID,
			BranchID:         transfer.ToBranchID,
			ProductID:        item.ProductID,
			Type:             "TRANSFER_IN",
			Quantity:         receivedQty,
			PreviousQuantity: prevQty,
			NewQuantity:      newStock.Quantity,
			ReferenceType:    "TRANSFER",
			ReferenceID:      transfer.ID,
			ReferenceNumber:  transfer.TransferNumber,
			CreatedBy:        u.ID,
		}
		m.deps.Repo.CreateStockMovement(c.Request.Context(), movement)

		updatedItems[i] = item
		updatedItems[i].ReceivedQuantity = receivedQty
	}

	// Update transfer status
	patch := bson.M{
		"status":     "RECEIVED",
		"receivedAt": time.Now().UTC(),
		"receivedBy": u.ID,
		"items":      updatedItems,
	}
	updated, err := m.deps.Repo.UpdateStockTransfer(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update transfer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (m *Module) cancelTransfer(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	transfer, err := m.deps.Repo.GetStockTransfer(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "transfer not found"})
		return
	}

	if transfer.Status == "RECEIVED" || transfer.Status == "CANCELLED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "transfer cannot be cancelled"})
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)

	// If in-transit, restore stock to source branch
	if transfer.Status == "IN_TRANSIT" {
		for _, item := range transfer.Items {
			m.deps.Repo.AdjustStock(c.Request.Context(), orgID, transfer.FromBranchID, item.ProductID, item.Quantity)
		}
	}

	patch := bson.M{
		"status":       "CANCELLED",
		"cancelledAt":  time.Now().UTC(),
		"cancelledBy":  u.ID,
		"cancelReason": req.Reason,
	}
	updated, err := m.deps.Repo.UpdateStockTransfer(c.Request.Context(), orgID, id, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to cancel transfer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// ============================================================================
// Summary
// ============================================================================

func (m *Module) getSummary(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	branchID := c.Query("branchId")

	all, err := m.deps.Repo.ListStockLevelsByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get summary"})
		return
	}

	products, _ := m.deps.Repo.ListProductsByOrg(c.Request.Context(), orgID)
	productMap := make(map[string]models.Product)
	for _, p := range products {
		productMap[p.ID] = p
	}

	var totalProducts, lowStockCount, outOfStockCount int
	var totalValue int64
	for _, s := range all {
		if branchID != "" && s.BranchID != branchID {
			continue
		}
		totalProducts++
		if s.Quantity <= 0 {
			outOfStockCount++
		} else if s.Quantity <= s.MinStock {
			lowStockCount++
		}
		if p, ok := productMap[s.ProductID]; ok {
			totalValue += p.Cost * int64(s.Quantity)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"totalProducts":   totalProducts,
			"totalValue":      totalValue,
			"lowStockCount":   lowStockCount,
			"outOfStockCount": outOfStockCount,
			"expiringCount":   0,
			"topMovingProducts": []interface{}{},
			"recentMovements":   []interface{}{},
		},
	})
}

// ============================================================================
// Helpers
// ============================================================================

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

func padNumber(n int64, width int) string {
	s := strconv.FormatInt(n, 10)
	for len(s) < width {
		s = "0" + s
	}
	return s
}
