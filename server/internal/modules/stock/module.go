package stockmodule

import (
	"net/http"
	"strings"
	"time"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "stock" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	// Existing stock level endpoints
	r.GET("/stock-levels", auth.RequireUser(), m.listStockLevels)
	r.PATCH("/stock-levels/:productId", auth.RequireUser(), auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.patchStockLevel)
	r.POST("/stock/adjust", auth.RequireUser(), auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.adjustStock)

	// Inventory module routes
	inv := r.Group("/inventory", auth.RequireUser())
	{
		// Stock levels
		inv.GET("/stock-levels", m.listInventoryStockLevels)
		inv.GET("/stock-levels/:productId", m.getInventoryStockLevel)
		inv.GET("/low-stock", m.getLowStock)
		inv.GET("/out-of-stock", m.getOutOfStock)
		inv.GET("/products/:productId/stock", m.getProductStock)

		// Movements
		inv.GET("/movements", m.listMovements)
		inv.GET("/movements/:id", m.getMovement)
		inv.GET("/products/:productId/movements", m.getProductMovements)

		// Adjustments
		inv.POST("/adjustments", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.createAdjustment)
		inv.POST("/adjustments/bulk", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.bulkAdjustment)

		// Lots
		inv.GET("/lots", m.listLots)
		inv.GET("/lots/:id", m.getLot)
		inv.POST("/lots", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.createLot)
		inv.PATCH("/lots/:id", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.updateLot)
		inv.GET("/products/:productId/lots", m.getProductLots)
		inv.PATCH("/products/:productId/reorder-point", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.setReorderPoint)

		// Transfers
		inv.GET("/transfers", m.listTransfers)
		inv.GET("/transfers/:id", m.getTransfer)
		inv.POST("/transfers", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.createTransfer)
		inv.PATCH("/transfers/:id", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.updateTransfer)
		inv.POST("/transfers/:id/send", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.sendTransfer)
		inv.POST("/transfers/:id/receive", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.receiveTransfer)
		inv.POST("/transfers/:id/cancel", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.cancelTransfer)

		// Summary
		inv.GET("/summary", m.getSummary)
	}
}

func (m *Module) listStockLevels(c *gin.Context) {
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

	branchID := strings.TrimSpace(c.Query("branchId"))
	if branchID == "" {
		c.JSON(http.StatusOK, gin.H{"stockLevels": all})
		return
	}

	filtered := make([]models.StockLevel, 0, len(all))
	for _, s := range all {
		if s.BranchID == branchID {
			filtered = append(filtered, s)
		}
	}
	c.JSON(http.StatusOK, gin.H{"stockLevels": filtered})
}

type patchStockRequest struct {
	BranchID    string `json:"branchId"`
	MinStock    *int   `json:"minStock"`
	BinLocation *string `json:"binLocation"`
}

func (m *Module) patchStockLevel(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	productID := c.Param("productId")
	var req patchStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	branchID := strings.TrimSpace(req.BranchID)
	if branchID == "" {
		branchID = auth.GetBranchIDForRequest(c, u)
	}
	if branchID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "branchId is required"})
		return
	}

	patch := bson.M{"orgId": orgID, "branchId": branchID, "productId": productID}
	if req.MinStock != nil {
		patch["minStock"] = *req.MinStock
	}
	if req.BinLocation != nil {
		patch["binLocation"] = strings.TrimSpace(*req.BinLocation)
	}

	// If only org/branch/product are set, no change.
	if len(patch) <= 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no changes"})
		return
	}

	// Ensure stock doc exists (without clobbering quantity).
	_, _ = m.deps.Repo.AdjustStock(c.Request.Context(), orgID, branchID, productID, 0)

	updated, err := m.deps.Repo.PatchStockLevel(c.Request.Context(), orgID, branchID, productID, patch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update stock"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"stockLevel": updated})
}

type adjustStockRequest struct {
	ProductID string `json:"productId"`
	BranchID  string `json:"branchId"`
	Quantity  int    `json:"quantity"`
	Type      string `json:"type"` // STOCK_IN|STOCK_OUT|ADJUSTMENT
	Note      string `json:"note"`
}

func (m *Module) adjustStock(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	branchID := strings.TrimSpace(c.GetHeader(auth.HeaderBranchID))
	if branchID == "" {
		branchID = auth.GetBranchIDForRequest(c, u)
	}
	if orgID == "" || branchID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org and branch context required"})
		return
	}

	var req adjustStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	req.ProductID = strings.TrimSpace(req.ProductID)
	if req.ProductID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "productId is required"})
		return
	}
	if strings.TrimSpace(req.BranchID) != "" {
		branchID = strings.TrimSpace(req.BranchID)
	}

	action := strings.ToUpper(strings.TrimSpace(req.Type))
	if action == "" {
		action = "ADJUSTMENT"
	}

	delta := req.Quantity
	switch action {
	case "STOCK_IN":
		// quantity means "add"
	case "STOCK_OUT":
		delta = -req.Quantity
	case "ADJUSTMENT":
		// quantity can be +/- already
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid type"})
		return
	}

	product, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, req.ProductID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid productId"})
		return
	}

	stock, err := m.deps.Repo.AdjustStock(c.Request.Context(), orgID, branchID, req.ProductID, delta)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to adjust stock"})
		return
	}

	// Create a transaction record.
	total := int64(0)
	if action == "STOCK_IN" {
		total = -(product.Cost * int64(req.Quantity))
	}

	txn := models.Transaction{
		ID:               "TXN-" + primitive.NewObjectID().Hex(),
		OrgID:            orgID,
		BranchID:         branchID,
		Date:             time.Now().UTC().Format(time.RFC3339),
		Channel:          "POS",
		Type:             action,
		Status:           "COMPLETED",
		FulfillmentStatus: "DELIVERED",
		Items: []models.TransactionItem{{
			ID:       product.ID,
			SKU:      product.SKU,
			Name:     product.Name,
			Category: product.Category,
			Image:    product.Image,
			Price:    product.Price,
			Cost:     product.Cost,
			Quantity: req.Quantity,
		}},
		Total:         total,
		UserID:        u.ID,
		RecipientName: "Stock Adjustment",
		Note:          strings.TrimSpace(req.Note),
	}

	createdTxn, err := m.deps.Repo.CreateTransaction(c.Request.Context(), txn)
	if err != nil {
		// best-effort rollback
		_, _ = m.deps.Repo.AdjustStock(c.Request.Context(), orgID, branchID, req.ProductID, -delta)
		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "duplicate transaction id"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stockLevel":  stock,
		"transaction": createdTxn,
	})
}
