package auditmodule

import (
	"net/http"
	"strconv"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"

	"github.com/gin-gonic/gin"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "audit" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/audit")
	g.Use(auth.RequireUser())
	// Audit logs are read-only for admins
	g.Use(auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin))

	g.GET("", m.list)
	g.GET("/:entityType/:entityId", m.listByEntity)
	g.GET("/users/:userId", m.listByUser)
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
	if entityType := c.Query("entityType"); entityType != "" {
		filter["entityType"] = entityType
	}
	if action := c.Query("action"); action != "" {
		filter["action"] = action
	}
	if userID := c.Query("userId"); userID != "" {
		filter["userId"] = userID
	}

	logs, total, err := m.deps.Repo.ListAuditLogsByOrg(c.Request.Context(), orgID, filter, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list audit logs"})
		return
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, gin.H{
		"data": logs,
		"meta": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

func (m *Module) listByEntity(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	entityType := c.Param("entityType")
	entityID := c.Param("entityId")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	logs, total, err := m.deps.Repo.ListAuditLogsByEntity(c.Request.Context(), orgID, entityType, entityID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list audit logs"})
		return
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, gin.H{
		"data": logs,
		"meta": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}

func (m *Module) listByUser(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	userID := c.Param("userId")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	logs, total, err := m.deps.Repo.ListAuditLogsByUser(c.Request.Context(), orgID, userID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list audit logs"})
		return
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, gin.H{
		"data": logs,
		"meta": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
	})
}
