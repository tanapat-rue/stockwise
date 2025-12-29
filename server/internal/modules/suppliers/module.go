package suppliersmodule

import (
	"net/http"
	"strings"

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

func (m *Module) Name() string { return "suppliers" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/suppliers")
	g.Use(auth.RequireUser())

	g.GET("", m.list)
	g.GET("/:id", m.get)
	g.POST("", m.create)
	g.PATCH("/:id", m.update)
}

func (m *Module) list(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	suppliers, err := m.deps.Repo.ListSuppliersByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list suppliers"})
		return
	}

	// Search filter
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))
	if search != "" {
		filtered := make([]models.Supplier, 0, len(suppliers))
		for _, s := range suppliers {
			nameMatch := strings.Contains(strings.ToLower(s.Name), search)
			contactMatch := strings.Contains(strings.ToLower(s.ContactName), search)
			emailMatch := strings.Contains(strings.ToLower(s.Email), search)
			phoneMatch := strings.Contains(strings.ToLower(s.Phone), search)
			if nameMatch || contactMatch || emailMatch || phoneMatch {
				filtered = append(filtered, s)
			}
		}
		suppliers = filtered
	}

	c.JSON(http.StatusOK, gin.H{
		"data": suppliers,
		"meta": gin.H{
			"page":       0,
			"limit":      len(suppliers),
			"total":      len(suppliers),
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
	supplier, err := m.deps.Repo.GetSupplierByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "supplier not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get supplier"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": supplier})
}

type createSupplierRequest struct {
	Name        string `json:"name"`
	ContactName string `json:"contactName"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Address     string `json:"address"`
	TaxID       string `json:"taxId"`
}

func (m *Module) create(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req createSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Phone = strings.TrimSpace(req.Phone)
	req.ContactName = strings.TrimSpace(req.ContactName)
	if req.Name == "" || req.Phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and phone are required"})
		return
	}
	if req.ContactName == "" {
		req.ContactName = "-"
	}

	supplier := models.Supplier{
		ID:          primitive.NewObjectID().Hex(),
		OrgID:       orgID,
		Name:        req.Name,
		ContactName: req.ContactName,
		Phone:       req.Phone,
		Email:       strings.TrimSpace(req.Email),
		Address:     strings.TrimSpace(req.Address),
		TaxID:       strings.TrimSpace(req.TaxID),
	}

	created, err := m.deps.Repo.CreateSupplier(c.Request.Context(), supplier)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create supplier"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": created})
}

type updateSupplierRequest struct {
	Name        *string `json:"name"`
	ContactName *string `json:"contactName"`
	Phone       *string `json:"phone"`
	Email       *string `json:"email"`
	Address     *string `json:"address"`
	TaxID       *string `json:"taxId"`
}

func (m *Module) update(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	var req updateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	patch := bson.M{}
	if req.Name != nil {
		patch["name"] = strings.TrimSpace(*req.Name)
	}
	if req.ContactName != nil {
		patch["contactName"] = strings.TrimSpace(*req.ContactName)
	}
	if req.Phone != nil {
		patch["phone"] = strings.TrimSpace(*req.Phone)
	}
	if req.Email != nil {
		patch["email"] = strings.TrimSpace(*req.Email)
	}
	if req.Address != nil {
		patch["address"] = strings.TrimSpace(*req.Address)
	}
	if req.TaxID != nil {
		patch["taxId"] = strings.TrimSpace(*req.TaxID)
	}

	if len(patch) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no changes"})
		return
	}

	updated, err := m.deps.Repo.UpdateSupplierByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "supplier not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update supplier"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}
