package authmodule

import (
	"net/http"
	"strings"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/gin-gonic/gin"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "auth" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/auth")
	g.POST("/login", m.login)
	g.POST("/signup", m.signup)
	g.POST("/logout", auth.RequireUser(), m.logout)
	g.GET("/me", auth.RequireUser(), m.me)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (m *Module) login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email and password are required"})
		return
	}

	user, err := m.deps.Repo.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil || !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	sessionID := auth.NewSessionID()
	if err := auth.SetSession(c.Request.Context(), m.deps.Sess, sessionID, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
		return
	}
	auth.SetSessionCookie(c, m.deps.Config, sessionID)

	// Get organization and branches for the response
	org, err := m.deps.Repo.GetOrg(c.Request.Context(), user.OrgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get organization"})
		return
	}

	branches, err := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), user.OrgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get branches"})
		return
	}

	user.PasswordHash = ""
	c.JSON(http.StatusOK, gin.H{
		"user":          user,
		"organization":  org,
		"organizations": []models.Organization{org},
		"branches":      branches,
	})
}

type signupRequest struct {
	OrgName string `json:"orgName"`
	TaxID   string `json:"taxId"`
	Address string `json:"address"`

	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (m *Module) signup(c *gin.Context) {
	var req signupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	req.OrgName = strings.TrimSpace(req.OrgName)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Name = strings.TrimSpace(req.Name)

	if req.OrgName == "" || req.Email == "" || req.Password == "" || req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "orgName, name, email and password are required"})
		return
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set password"})
		return
	}

	orgID := primitive.NewObjectID().Hex()
	org := models.Organization{
		ID:      orgID,
		Name:    req.OrgName,
		TaxID:   strings.TrimSpace(req.TaxID),
		Address: strings.TrimSpace(req.Address),
	}
	org, err = m.deps.Repo.CreateOrg(c.Request.Context(), org)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create org"})
		return
	}

	branchID := primitive.NewObjectID().Hex()
	branch := models.Branch{
		ID:      branchID,
		OrgID:   orgID,
		Name:    "Main Branch",
		Address: strings.TrimSpace(req.Address),
		IsMain:  true,
	}
	branch, err = m.deps.Repo.CreateBranch(c.Request.Context(), branch)
	if err != nil {
		_ = m.deps.Repo.DeleteOrg(c.Request.Context(), orgID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create branch"})
		return
	}

	userID := primitive.NewObjectID().Hex()
	user := models.User{
		ID:           userID,
		OrgID:        orgID,
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: passwordHash,
		Role:         models.RoleOrgAdmin,
		IsActive:     true,
	}
	user, err = m.deps.Repo.CreateUser(c.Request.Context(), user)
	if err != nil {
		// Cleanup best-effort.
		_ = m.deps.Repo.DeleteBranch(c.Request.Context(), branchID)
		_ = m.deps.Repo.DeleteOrg(c.Request.Context(), orgID)

		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	sessionID := auth.NewSessionID()
	if err := auth.SetSession(c.Request.Context(), m.deps.Sess, sessionID, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
		return
	}
	auth.SetSessionCookie(c, m.deps.Config, sessionID)

	user.PasswordHash = ""
	c.JSON(http.StatusCreated, gin.H{
		"user":   user,
		"org":    org,
		"branch": branch,
	})
}

func (m *Module) logout(c *gin.Context) {
	sessionID, _ := c.Cookie(m.deps.Config.Session.CookieName)
	if sessionID != "" {
		_ = m.deps.Sess.Del(c.Request.Context(), sessionID)
	}
	auth.ClearSessionCookie(c, m.deps.Config)
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (m *Module) me(c *gin.Context) {
	u := auth.CurrentUser(c)
	if u == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Get organization and branches for the response
	org, err := m.deps.Repo.GetOrg(c.Request.Context(), u.OrgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get organization"})
		return
	}

	branches, err := m.deps.Repo.ListBranchesByOrg(c.Request.Context(), u.OrgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get branches"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":          u,
		"organization":  org,
		"organizations": []models.Organization{org},
		"branches":      branches,
	})
}
