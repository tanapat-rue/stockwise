package billingmodule

import (
	"io"
	"net/http"
	"strings"

	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	"stockflows/server/internal/models"
	"stockflows/server/internal/omise"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

type Module struct {
	deps deps.Dependencies
}

func New(deps deps.Dependencies) *Module { return &Module{deps: deps} }

func (m *Module) Name() string { return "billing" }

func (m *Module) RegisterRoutes(r *gin.RouterGroup) {
	g := r.Group("/billing")
	g.Use(auth.RequireUser())

	g.GET("/subscription", m.getSubscription)
	g.GET("/omise/public-key", m.getOmisePublicKey)
	g.POST("/omise/customer", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin), m.createOmiseCustomer)
	g.POST("/omise/test-charge", auth.RequireRoles(models.RolePlatformAdmin, models.RoleOrgAdmin), m.testCharge)
	g.POST("/omise/webhook", m.omiseWebhook) // scaffold
}

func (m *Module) getSubscription(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	org, err := m.deps.Repo.GetOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "org not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"subscription": org.Subscription})
}

func (m *Module) getOmisePublicKey(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"publicKey": strings.TrimSpace(m.deps.Config.Omise.PublicKey)})
}

type createCustomerRequest struct {
	CardToken string `json:"cardToken"`
	Email     string `json:"email"`
	Name      string `json:"name"`
}

func (m *Module) createOmiseCustomer(c *gin.Context) {
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
	req.CardToken = strings.TrimSpace(req.CardToken)
	req.Email = strings.TrimSpace(req.Email)
	req.Name = strings.TrimSpace(req.Name)

	if req.CardToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cardToken is required"})
		return
	}

	client := omise.New(m.deps.Config.Omise.SecretKey)
	customer, err := client.CreateCustomer(
		c.Request.Context(),
		req.Email,
		"StockWise org "+orgID+" ("+req.Name+")",
		req.CardToken,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updated, err := m.deps.Repo.UpdateOrg(c.Request.Context(), orgID, bson.M{
		"subscription.omiseCustomerId": customer.ID,
		"subscription.status":         "connected",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save subscription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"customer":      customer,
		"subscription":  updated.Subscription,
		"organization":  updated.ID,
	})
}

type testChargeRequest struct {
	Amount   int64  `json:"amount"`
	Currency string `json:"currency"`
}

func (m *Module) testCharge(c *gin.Context) {
	u := auth.CurrentUser(c)
	orgID := auth.GetOrgIDForRequest(c, u)
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "org context required"})
		return
	}

	org, err := m.deps.Repo.GetOrg(c.Request.Context(), orgID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "org not found"})
		return
	}
	if strings.TrimSpace(org.Subscription.OmiseCustomerID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "omise customer not set"})
		return
	}

	var req testChargeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be > 0"})
		return
	}

	client := omise.New(m.deps.Config.Omise.SecretKey)
	charge, err := client.CreateCharge(c.Request.Context(), req.Amount, req.Currency, org.Subscription.OmiseCustomerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"charge": charge})
}

func (m *Module) omiseWebhook(c *gin.Context) {
	// Scaffold: accept event and let operators wire specific plan/schedule mapping.
	body, _ := io.ReadAll(c.Request.Body)
	_ = body

	// In production:
	// - verify webhook signature
	// - parse event type
	// - update organization.subscription accordingly
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
