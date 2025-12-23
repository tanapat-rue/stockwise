package auth

import (
	"net/http"

	"stockflows/server/internal/deps"

	"github.com/gin-gonic/gin"
)

// OptionalSession loads the user from the session cookie (if present) and stores it in context.
func OptionalSession(deps deps.Dependencies) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID, err := c.Cookie(deps.Config.Session.CookieName)
		if err != nil || sessionID == "" {
			c.Next()
			return
		}

		sess, ok, err := GetSession(c.Request.Context(), deps.Sess, sessionID)
		if err != nil || !ok || sess.UserID == "" {
			ClearSessionCookie(c, deps.Config)
			c.Next()
			return
		}

		user, err := deps.Repo.GetUser(c.Request.Context(), sess.UserID)
		if err != nil || !user.IsActive {
			_ = deps.Sess.Del(c.Request.Context(), sessionID)
			ClearSessionCookie(c, deps.Config)
			c.Next()
			return
		}

		user.PasswordHash = ""
		c.Set(CtxUserKey, user)
		c.Next()
	}
}

func RequireUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		if CurrentUser(c) == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Next()
	}
}

