package uploadsmodule

import (
	"net/http"
	"path/filepath"
	"strings"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "uploads" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/uploads")
	g.Use(auth.RequireUser())

	g.POST("", m.upload)
}

func (m *Module) upload(c *gin.Context) {
	if m.deps.MinIO == nil || strings.TrimSpace(m.deps.Config.MinIO.Endpoint) == "" {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "minio not configured"})
		return
	}

	u := auth.CurrentUser(c)
	if u == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read upload"})
		return
	}
	defer f.Close()

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		ext = ".bin"
	}

	key := strings.TrimPrefix(uuid.NewString(), "{") // safe
	objectName := u.OrgID + "/images/" + key + ext
	contentType := file.Header.Get("Content-Type")

	_, err = m.deps.MinIO.PutObject(c.Request.Context(), m.deps.Config.MinIO.Bucket, objectName, f, file.Size, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store file"})
		return
	}

	url := ""
	if strings.TrimSpace(m.deps.Config.MinIO.PublicURL) != "" {
		url = strings.TrimRight(m.deps.Config.MinIO.PublicURL, "/") + "/" + objectName
	}

	c.JSON(http.StatusOK, gin.H{
		"key": objectName,
		"url": url,
	})
}

