package branchesmodule

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

func (m *Module) Name() string { return "branches" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/branches")
	g.Use(auth.RequireUser())

	g.GET("", m.list)
	g.POST("", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin), m.create)
}

func (m *Module) list(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	branches, err := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list branches"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"branches": branches})
}

type createBranchRequest struct {
	Name    string `json:"name"`
	Address string `json:"address"`
	IsMain  bool   `json:"isMain"`
}

func (m *Module) create(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req createBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	branchID := primitive.NewObjectID().Hex()
	branch := models.Branch{
		ID:      branchID,
		OrgID:   orgID,
		Name:    req.Name,
		Address: strings.TrimSpace(req.Address),
		IsMain:  req.IsMain,
	}

	branch, err := m.deps.Repo.CreateBranch(c.Request.Context(), branch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create branch"})
		return
	}

	// If a new main branch is created, unset other main branches.
	if branch.IsMain {
		_, _ = m.deps.Mongo.Collection(repo.ColBranches).UpdateMany(
			c.Request.Context(),
			bson.M{"orgId": orgID, "_id": bson.M{"$ne": branch.ID}},
			bson.M{"$set": bson.M{"isMain": false}},
		)
	}

	c.JSON(http.StatusCreated, gin.H{"branch": branch})
}
