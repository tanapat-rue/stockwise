package productsmodule

import (
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	"stockflows/server/internal/models"
	"stockflows/server/internal/repo"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/gin-gonic/gin"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "products" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/products")
	g.Use(auth.RequireUser())

	g.GET("", m.list)
	g.GET("/:id", m.get)
	g.GET("/:id/image", m.getImage)
	g.POST("", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.create)
	g.POST("/:id/image", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.uploadImage)
	g.PATCH("/:id", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.update)
	g.DELETE("/:id", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.delete)
}

func (m *Module) list(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	products, err := m.deps.Repo.ListProductsByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list products"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": products,
		"meta": gin.H{
			"page":       0,
			"limit":      len(products),
			"total":      len(products),
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
	product, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get product"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": product})
}

type createProductRequest struct {
	SKU         string `json:"sku"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Price       int64  `json:"price"`
	Cost        int64  `json:"cost"`
	Category    string `json:"category"`
	Image       string `json:"image"`
	ImageKey    string `json:"imageKey"`
	Weight      int    `json:"weight"`
	Dimensions  string `json:"dimensions"`
}

func (m *Module) create(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req createProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	req.SKU = strings.TrimSpace(req.SKU)
	req.Name = strings.TrimSpace(req.Name)
	if req.SKU == "" || req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sku and name are required"})
		return
	}

	p := models.Product{
		ID:         primitive.NewObjectID().Hex(),
		OrgID:      orgID,
		SKU:        req.SKU,
		Name:       req.Name,
		Desc:       strings.TrimSpace(req.Description),
		Price:      req.Price,
		Cost:       req.Cost,
		Category:   strings.TrimSpace(req.Category),
		Image:      strings.TrimSpace(req.Image),
		ImageKey:   strings.TrimSpace(req.ImageKey),
		WeightGram: req.Weight,
		Dimensions: strings.TrimSpace(req.Dimensions),
	}

	created, err := m.deps.Repo.CreateProduct(c.Request.Context(), p)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "sku already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create product"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

type updateProductRequest struct {
	SKU         *string `json:"sku"`
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Price       *int64  `json:"price"`
	Cost        *int64  `json:"cost"`
	Category    *string `json:"category"`
	Image       *string `json:"image"`
	ImageKey    *string `json:"imageKey"`
	Weight      *int    `json:"weight"`
	Dimensions  *string `json:"dimensions"`
}

func (m *Module) update(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	var req updateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	patch := bson.M{}
	if req.SKU != nil {
		patch["sku"] = strings.TrimSpace(*req.SKU)
	}
	if req.Name != nil {
		patch["name"] = strings.TrimSpace(*req.Name)
	}
	if req.Description != nil {
		patch["description"] = strings.TrimSpace(*req.Description)
	}
	if req.Price != nil {
		patch["price"] = *req.Price
	}
	if req.Cost != nil {
		patch["cost"] = *req.Cost
	}
	if req.Category != nil {
		patch["category"] = strings.TrimSpace(*req.Category)
	}
	if req.Image != nil {
		patch["image"] = strings.TrimSpace(*req.Image)
	}
	if req.ImageKey != nil {
		patch["imageKey"] = strings.TrimSpace(*req.ImageKey)
	}
	if req.Weight != nil {
		patch["weightGram"] = *req.Weight
	}
	if req.Dimensions != nil {
		patch["dimensions"] = strings.TrimSpace(*req.Dimensions)
	}

	if len(patch) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no changes"})
		return
	}

	updated, err := m.deps.Repo.UpdateProductByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
			return
		}
		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "sku already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update product"})
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

	// Check if product has any stock
	hasStock, err := m.deps.Repo.ProductHasStock(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check product stock"})
		return
	}
	if hasStock {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot delete product with stock, adjust stock to zero first"})
		return
	}

	// Check if product has any reservations
	hasReservations, err := m.deps.Repo.ProductHasReservations(c.Request.Context(), orgID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check product reservations"})
		return
	}
	if hasReservations {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot delete product with active reservations"})
		return
	}

	if err := m.deps.Repo.DeleteProductByOrg(c.Request.Context(), orgID, id); err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete product"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

const maxProductImageBytes = 5 * 1024 * 1024 // 5MB

func imageExtFromContentType(contentType string) (string, bool) {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "image/jpeg", "image/jpg":
		return ".jpg", true
	case "image/png":
		return ".png", true
	case "image/webp":
		return ".webp", true
	default:
		return "", false
	}
}

func (m *Module) uploadImage(c *gin.Context) {
	if m.deps.MinIO == nil || strings.TrimSpace(m.deps.Config.MinIO.Endpoint) == "" {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "minio not configured"})
		return
	}

	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	productID := c.Param("id")
	product, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	if file.Size <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file"})
		return
	}
	if file.Size > maxProductImageBytes {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file too large"})
		return
	}

	contentType := strings.TrimSpace(file.Header.Get("Content-Type"))
	ext, ok := imageExtFromContentType(contentType)
	if !ok {
		// Fallback: infer from filename extension.
		ext = strings.ToLower(filepath.Ext(file.Filename))
		if ext == ".jpeg" {
			ext = ".jpg"
		}
		if ext != ".jpg" && ext != ".png" && ext != ".webp" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported image type"})
			return
		}
		if contentType == "" {
			switch ext {
			case ".png":
				contentType = "image/png"
			case ".webp":
				contentType = "image/webp"
			default:
				contentType = "image/jpeg"
			}
		}
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read upload"})
		return
	}
	defer f.Close()

	objectName := fmt.Sprintf("products/%s/%s/main%s", orgID, product.ID, ext)
	_, err = m.deps.MinIO.PutObject(c.Request.Context(), m.deps.Config.MinIO.Bucket, objectName, io.LimitReader(f, maxProductImageBytes+1), file.Size, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store image"})
		return
	}

	updated, err := m.deps.Repo.UpdateProductByOrg(c.Request.Context(), orgID, product.ID, bson.M{
		"imageKey": objectName,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update product"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"product": updated,
		"key":     objectName,
		"url":     fmt.Sprintf("/api/products/%s/image", updated.ID),
	})
}

func (m *Module) getImage(c *gin.Context) {
	if m.deps.MinIO == nil || strings.TrimSpace(m.deps.Config.MinIO.Endpoint) == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	productID := c.Param("id")
	product, err := m.deps.Repo.GetProductByOrg(c.Request.Context(), orgID, productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	key := strings.TrimSpace(product.ImageKey)
	prefix := fmt.Sprintf("products/%s/%s/", orgID, product.ID)
	if key == "" || !strings.HasPrefix(key, prefix) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	info, err := m.deps.MinIO.StatObject(c.Request.Context(), m.deps.Config.MinIO.Bucket, key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	obj, err := m.deps.MinIO.GetObject(c.Request.Context(), m.deps.Config.MinIO.Bucket, key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	defer obj.Close()

	contentType := info.ContentType
	if strings.TrimSpace(contentType) == "" {
		contentType = "application/octet-stream"
	}
	c.DataFromReader(http.StatusOK, info.Size, contentType, obj, nil)
}
