package usersmodule

import (
	"net/http"
	"strings"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/gin-gonic/gin"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "users" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/users")
	g.Use(auth.RequireUser(), auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin))

	g.GET("", m.list)
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

	users, err := m.deps.Repo.ListUsersByOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list users"})
		return
	}
	for i := range users {
		users[i].PasswordHash = ""
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

type createUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
	BranchID string `json:"branchId"`
}

func (m *Module) create(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	var req createUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Role = strings.TrimSpace(req.Role)
	req.BranchID = strings.TrimSpace(req.BranchID)

	if req.Name == "" || req.Email == "" || req.Password == "" || req.Role == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name, email, password and role are required"})
		return
	}

	role := models.Role(req.Role)
	switch role {
	case models.RolePlatformAdmin, models.RoleOrgAdmin, models.RoleBranchManager, models.RoleStaff:
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role"})
		return
	}

	if role == models.RolePlatformAdmin {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot create platform admin via API"})
		return
	}

	if req.BranchID != "" {
		_, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, req.BranchID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid branchId"})
			return
		}
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set password"})
		return
	}

	userID := primitive.NewObjectID().Hex()
	newUser := models.User{
		ID:           userID,
		OrgID:        orgID,
		BranchID:     req.BranchID,
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: passwordHash,
		Role:         role,
		IsActive:     true,
	}

	newUser, err = m.deps.Repo.CreateUser(c.Request.Context(), newUser)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	newUser.PasswordHash = ""
	c.JSON(http.StatusCreated, gin.H{"user": newUser})
}

type updateUserRequest struct {
	Name     *string `json:"name"`
	Role     *string `json:"role"`
	BranchID *string `json:"branchId"`
	IsActive *bool   `json:"isActive"`
}

func (m *Module) update(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	userID := c.Param("id")
	var req updateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	patch := bson.M{}
	if req.Name != nil {
		patch["name"] = strings.TrimSpace(*req.Name)
	}
	if req.Role != nil {
		role := models.Role(strings.TrimSpace(*req.Role))
		switch role {
		case models.RoleOrgAdmin, models.RoleBranchManager, models.RoleStaff:
			patch["role"] = role
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role"})
			return
		}
	}
	if req.BranchID != nil {
		branchID := strings.TrimSpace(*req.BranchID)
		if branchID != "" {
			_, err := m.deps.Repo.GetBranchByOrg(c.Request.Context(), orgID, branchID)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid branchId"})
				return
			}
		}
		patch["branchId"] = branchID
	}
	if req.IsActive != nil {
		patch["isActive"] = *req.IsActive
	}

	if len(patch) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no changes"})
		return
	}

	// Ensure the target user belongs to the org (unless platform admin overriding org context).
	// We guard by including orgId in the update filter.
	patchRes, err := m.deps.Mongo.Collection("users").UpdateOne(
		c.Request.Context(),
		bson.M{"_id": userID, "orgId": orgID},
		bson.M{"$set": patch},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}
	if patchRes.MatchedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	updated, err := m.deps.Repo.GetUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}
	updated.PasswordHash = ""
	c.JSON(http.StatusOK, gin.H{"user": updated})
}

