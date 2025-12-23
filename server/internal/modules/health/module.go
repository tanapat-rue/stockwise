package health

import (
	"net/http"

	"stockflows/server/internal/deps"

	"github.com/gin-gonic/gin"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module {
	return &Module{deps: deps}
}

func (m *Module) Name() string { return "health" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	r.GET("/healthz", m.healthz)
	r.GET("/readyz", m.readyz)
}

func (m *Module) healthz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (m *Module) readyz(c *gin.Context) {
	ctx := c.Request.Context()
	if err := m.deps.Mongo.Ping(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready", "mongo": "down"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}
