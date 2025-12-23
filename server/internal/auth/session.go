package auth

import (
	"context"
	"net/http"
	"strings"
	"time"

	"stockflows/server/internal/appconfig"
	"stockflows/server/internal/models"
	"stockflows/server/platform/session"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	CtxUserKey = "auth.user"

	HeaderOrgID    = "X-Org-Id"
	HeaderBranchID = "X-Branch-Id"
)

type SessionData struct {
	UserID   string      `json:"userId"`
	OrgID    string      `json:"orgId"`
	BranchID string      `json:"branchId,omitempty"`
	Role     models.Role `json:"role"`
}

func NewSessionID() string { return uuid.NewString() }

func SetSession(ctx context.Context, store session.Store, sessionID string, user models.User) error {
	// Store a map to keep compatibility across MongoStore (json) and MemoryStore (in-memory).
	return store.Set(ctx, sessionID, map[string]any{
		"userId":   user.ID,
		"orgId":    user.OrgID,
		"branchId": user.BranchID,
		"role":     user.Role,
	})
}

func GetSession(ctx context.Context, store session.Store, sessionID string) (SessionData, bool, error) {
	raw, ok, err := store.Get(ctx, sessionID)
	if err != nil || !ok {
		return SessionData{}, ok, err
	}

	switch v := raw.(type) {
	case SessionData:
		return v, true, nil
	case map[string]any:
		return sessionDataFromMap(v), true, nil
	default:
		// Best-effort: if json decoded into map[string]interface{} it's covered above.
		return SessionData{}, false, nil
	}
}

func sessionDataFromMap(m map[string]any) SessionData {
	var out SessionData
	if v, ok := m["userId"].(string); ok {
		out.UserID = v
	}
	if v, ok := m["orgId"].(string); ok {
		out.OrgID = v
	}
	if v, ok := m["branchId"].(string); ok {
		out.BranchID = v
	}
	// role may come back as string
	if v, ok := m["role"].(string); ok {
		out.Role = models.Role(v)
	}
	return out
}

func SetSessionCookie(c *gin.Context, cfg appconfig.Config, sessionID string) {
	maxAge := cfg.Session.TTLSeconds
	if maxAge < 0 {
		maxAge = 0
	}

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     cfg.Session.CookieName,
		Value:    sessionID,
		Path:     "/",
		Domain:   strings.TrimSpace(cfg.HTTP.CookieDomain),
		MaxAge:   maxAge,
		Expires:  time.Now().Add(time.Duration(maxAge) * time.Second),
		HttpOnly: true,
		Secure:   cfg.HTTP.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func ClearSessionCookie(c *gin.Context, cfg appconfig.Config) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     cfg.Session.CookieName,
		Value:    "",
		Path:     "/",
		Domain:   strings.TrimSpace(cfg.HTTP.CookieDomain),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cfg.HTTP.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}
