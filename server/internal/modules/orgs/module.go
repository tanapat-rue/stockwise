package orgsmodule

import (
	"net/http"
	"strings"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/gin-gonic/gin"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "orgs" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/orgs")
	g.Use(auth.RequireUser())

	g.GET("", m.list)
	g.POST("", auth.RequireRoles(models.RolePlatformAdmin), m.create)
}

func (m *Module) list(c *gin.Context) {
	u := auth.CurrentUser(c)
	if u == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if u.Role == models.RolePlatformAdmin {
		orgs, err := m.deps.Repo.ListOrgs(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list orgs"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"orgs": orgs})
		return
	}

	org, err := m.deps.Repo.GetOrg(c.Request.Context(), u.OrgID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"orgs": []models.Organization{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"orgs": []models.Organization{org}})
}

type createOrgRequest struct {
	Name    string `json:"name"`
	TaxID   string `json:"taxId"`
	Address string `json:"address"`
}

func (m *Module) create(c *gin.Context) {
	var req createOrgRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	orgID := primitive.NewObjectID().Hex()
	org := models.Organization{
		ID:      orgID,
		Name:    req.Name,
		TaxID:   strings.TrimSpace(req.TaxID),
		Address: strings.TrimSpace(req.Address),
	}

	org, err := m.deps.Repo.CreateOrg(c.Request.Context(), org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create org"})
		return
	}

	// Auto-create a main branch for the org.
	branchID := primitive.NewObjectID().Hex()
	branch := models.Branch{
		ID:      branchID,
		OrgID:   orgID,
		Name:    "Main Branch",
		Address: strings.TrimSpace(req.Address),
		IsMain:  true,
	}
	_, _ = m.deps.Repo.CreateBranch(c.Request.Context(), branch)

	c.JSON(http.StatusCreated, gin.H{"org": org})
}

