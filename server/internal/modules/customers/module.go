package customersmodule

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

func (m *Module) Name() string { return "customers" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/customers")
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

	customers, err := m.deps.Repo.ListCustomersByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list customers"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": customers,
		"meta": gin.H{
			"page":       0,
			"limit":      len(customers),
			"total":      len(customers),
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
	customer, err := m.deps.Repo.GetCustomerByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "customer not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get customer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": customer})
}

type createCustomerRequest struct {
	Name    string `json:"name"`
	Phone   string `json:"phone"`
	Email   string `json:"email"`
	Address string `json:"address"`
}

func (m *Module) create(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req createCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Phone = strings.TrimSpace(req.Phone)
	if req.Name == "" || req.Phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and phone are required"})
		return
	}

	customer := models.Customer{
		ID:        primitive.NewObjectID().Hex(),
		OrgID:     orgID,
		Name:      req.Name,
		Phone:     req.Phone,
		Email:     strings.TrimSpace(req.Email),
		Address:   strings.TrimSpace(req.Address),
		Points:    0,
		TotalSpent: 0,
	}

	created, err := m.deps.Repo.CreateCustomer(c.Request.Context(), customer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create customer"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

type updateCustomerRequest struct {
	Name    *string `json:"name"`
	Phone   *string `json:"phone"`
	Email   *string `json:"email"`
	Address *string `json:"address"`
}

func (m *Module) update(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	var req updateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	patch := bson.M{}
	if req.Name != nil {
		patch["name"] = strings.TrimSpace(*req.Name)
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
	if len(patch) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no changes"})
		return
	}

	updated, err := m.deps.Repo.UpdateCustomerByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "customer not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update customer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updated})
}
