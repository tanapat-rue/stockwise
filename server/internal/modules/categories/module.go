package categoriesmodule

import (
	"net/http"
	"regexp"
	"strings"
	"unicode"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	"stockflows/server/internal/models"
	"stockflows/server/internal/repo"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "categories" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/categories")
	g.Use(auth.RequireUser())

	g.GET("", m.list)
	g.GET("/tree", m.tree)
	g.GET("/:id", m.get)
	g.POST("", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.create)
	g.PATCH("/:id", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.update)
	g.DELETE("/:id", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.delete)
	g.POST("/reorder", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager), m.reorder)
}

func (m *Module) list(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	filter := bson.M{}

	// Apply filters from query params
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		filter["name"] = bson.M{"$regex": search, "$options": "i"}
	}
	if parentID := strings.TrimSpace(c.Query("parentId")); parentID != "" {
		filter["parentId"] = parentID
	}
	if isActive := strings.TrimSpace(c.Query("isActive")); isActive != "" {
		filter["isActive"] = isActive == "true"
	}

	categories, err := m.deps.Repo.ListCategoriesByOrg(c.Request.Context(), orgID, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list categories"})
		return
	}

	// Get product counts for each category
	for i := range categories {
		count, _ := m.deps.Repo.CountProductsByCategory(c.Request.Context(), orgID, categories[i].ID)
		categories[i].SortOrder = int(count) // Temporarily reusing sortOrder to pass product count
	}

	c.JSON(http.StatusOK, gin.H{
		"data": categories,
		"meta": gin.H{
			"page":       0,
			"limit":      len(categories),
			"total":      len(categories),
			"totalPages": 1,
		},
	})
}

// CategoryWithChildren is used for tree response
type CategoryWithChildren struct {
	models.Category
	Children     []CategoryWithChildren `json:"children"`
	Depth        int                    `json:"depth"`
	ProductCount int64                  `json:"productCount,omitempty"`
}

func (m *Module) tree(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	categories, err := m.deps.Repo.ListCategoriesByOrg(c.Request.Context(), orgID, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list categories"})
		return
	}

	// Build category map
	categoryMap := make(map[string]*CategoryWithChildren)
	for _, cat := range categories {
		count, _ := m.deps.Repo.CountProductsByCategory(c.Request.Context(), orgID, cat.ID)
		categoryMap[cat.ID] = &CategoryWithChildren{
			Category:     cat,
			Children:     []CategoryWithChildren{},
			Depth:        0,
			ProductCount: count,
		}
	}

	// Build tree structure
	var roots []CategoryWithChildren
	for _, cat := range categoryMap {
		if cat.ParentID == "" {
			roots = append(roots, *cat)
		} else if parent, exists := categoryMap[cat.ParentID]; exists {
			cat.Depth = parent.Depth + 1
			parent.Children = append(parent.Children, *cat)
		} else {
			// Orphaned category (parent doesn't exist), add to roots
			roots = append(roots, *cat)
		}
	}

	// Re-populate children recursively with correct depth
	roots = buildTreeWithDepth(categoryMap, roots, 0)

	c.JSON(http.StatusOK, gin.H{"data": roots})
}

func buildTreeWithDepth(categoryMap map[string]*CategoryWithChildren, nodes []CategoryWithChildren, depth int) []CategoryWithChildren {
	for i := range nodes {
		nodes[i].Depth = depth
		// Find all children for this node
		nodes[i].Children = []CategoryWithChildren{}
		for _, cat := range categoryMap {
			if cat.ParentID == nodes[i].ID {
				nodes[i].Children = append(nodes[i].Children, *cat)
			}
		}
		if len(nodes[i].Children) > 0 {
			nodes[i].Children = buildTreeWithDepth(categoryMap, nodes[i].Children, depth+1)
		}
	}
	return nodes
}

func (m *Module) get(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	category, err := m.deps.Repo.GetCategoryByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "category not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get category"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": category})
}

type createCategoryRequest struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	ParentID    string `json:"parentId"`
	Description string `json:"description"`
	Image       string `json:"image"`
	SortOrder   int    `json:"sortOrder"`
	IsActive    *bool  `json:"isActive"`
}

func (m *Module) create(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req createCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	// Generate slug if not provided
	slug := strings.TrimSpace(req.Slug)
	if slug == "" {
		slug = slugify(req.Name)
	}

	// Check for duplicate slug
	existing, err := m.deps.Repo.GetCategoryBySlug(c.Request.Context(), orgID, slug)
	if err == nil && existing.ID != "" {
		// Add suffix to make unique
		slug = slug + "-" + primitive.NewObjectID().Hex()[:6]
	}

	// Build path based on parent
	path := "/"
	if req.ParentID != "" {
		parent, err := m.deps.Repo.GetCategoryByOrg(c.Request.Context(), orgID, req.ParentID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid parent category"})
			return
		}
		path = parent.Path
		if !strings.HasSuffix(path, "/") {
			path += "/"
		}
	}

	id := primitive.NewObjectID().Hex()
	path += id

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	category := models.Category{
		ID:          id,
		OrgID:       orgID,
		Name:        req.Name,
		Slug:        slug,
		ParentID:    req.ParentID,
		Path:        path,
		Description: strings.TrimSpace(req.Description),
		Image:       strings.TrimSpace(req.Image),
		SortOrder:   req.SortOrder,
		IsActive:    isActive,
	}

	created, err := m.deps.Repo.CreateCategory(c.Request.Context(), category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create category"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": created})
}

type updateCategoryRequest struct {
	Name        *string `json:"name"`
	Slug        *string `json:"slug"`
	ParentID    *string `json:"parentId"`
	Description *string `json:"description"`
	Image       *string `json:"image"`
	SortOrder   *int    `json:"sortOrder"`
	IsActive    *bool   `json:"isActive"`
}

func (m *Module) update(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	id := c.Param("id")
	var req updateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	// Get existing category
	existing, err := m.deps.Repo.GetCategoryByOrg(c.Request.Context(), orgID, id)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "category not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get category"})
		return
	}

	patch := bson.M{}

	if req.Name != nil {
		patch["name"] = strings.TrimSpace(*req.Name)
	}
	if req.Slug != nil {
		slug := strings.TrimSpace(*req.Slug)
		// Check for duplicate slug (excluding self)
		existingBySlug, err := m.deps.Repo.GetCategoryBySlug(c.Request.Context(), orgID, slug)
		if err == nil && existingBySlug.ID != id {
			c.JSON(http.StatusConflict, gin.H{"error": "slug already exists"})
			return
		}
		patch["slug"] = slug
	}
	if req.Description != nil {
		patch["description"] = strings.TrimSpace(*req.Description)
	}
	if req.Image != nil {
		patch["image"] = strings.TrimSpace(*req.Image)
	}
	if req.SortOrder != nil {
		patch["sortOrder"] = *req.SortOrder
	}
	if req.IsActive != nil {
		patch["isActive"] = *req.IsActive
	}

	// Handle parent change (path update)
	if req.ParentID != nil && *req.ParentID != existing.ParentID {
		oldPath := existing.Path
		newPath := "/"

		if *req.ParentID != "" {
			parent, err := m.deps.Repo.GetCategoryByOrg(c.Request.Context(), orgID, *req.ParentID)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid parent category"})
				return
			}
			// Prevent circular reference
			if strings.HasPrefix(parent.Path, existing.Path) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "cannot set descendant as parent"})
				return
			}
			newPath = parent.Path
			if !strings.HasSuffix(newPath, "/") {
				newPath += "/"
			}
		}
		newPath += id

		patch["parentId"] = *req.ParentID
		patch["path"] = newPath

		// Update all descendant paths
		if err := m.deps.Repo.UpdateCategoriesByPath(c.Request.Context(), orgID, oldPath+"/", newPath+"/"); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update descendant paths"})
			return
		}
	}

	if len(patch) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no changes"})
		return
	}

	updated, err := m.deps.Repo.UpdateCategoryByOrg(c.Request.Context(), orgID, id, patch)
	if err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "category not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update category"})
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

	// Check if category has children
	children, err := m.deps.Repo.ListCategoriesByOrg(c.Request.Context(), orgID, bson.M{"parentId": id})
	if err == nil && len(children) > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "cannot delete category with subcategories"})
		return
	}

	// Check if category has products
	productCount, _ := m.deps.Repo.CountProductsByCategory(c.Request.Context(), orgID, id)
	if productCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "cannot delete category with products"})
		return
	}

	if err := m.deps.Repo.DeleteCategoryByOrg(c.Request.Context(), orgID, id); err != nil {
		if err == repo.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "category not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete category"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

type reorderRequest struct {
	Orders []struct {
		ID        string `json:"id"`
		SortOrder int    `json:"sortOrder"`
	} `json:"orders"`
}

func (m *Module) reorder(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req reorderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	// Convert to struct format expected by repo
	orders := make([]struct {
		ID        string
		SortOrder int
	}, len(req.Orders))

	for i, o := range req.Orders {
		orders[i].ID = o.ID
		orders[i].SortOrder = o.SortOrder
	}

	if err := m.deps.Repo.BulkUpdateCategorySortOrder(c.Request.Context(), orgID, orders); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reorder categories"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// slugify converts a string to a URL-friendly slug
func slugify(s string) string {
	// Convert to lowercase
	s = strings.ToLower(s)

	// Replace spaces and special chars with dashes
	var result strings.Builder
	prevDash := false

	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			result.WriteRune(r)
			prevDash = false
		} else if !prevDash {
			result.WriteRune('-')
			prevDash = true
		}
	}

	// Remove leading/trailing dashes
	slug := strings.Trim(result.String(), "-")

	// Remove multiple consecutive dashes
	re := regexp.MustCompile(`-+`)
	slug = re.ReplaceAllString(slug, "-")

	return slug
}
