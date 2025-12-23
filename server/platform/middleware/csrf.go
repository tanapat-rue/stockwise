package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CSRFOriginProtection provides a simple Origin-based CSRF protection for browser requests.
//
// - Only applies to state-changing methods.
// - If Origin is missing, the request is allowed (common for non-browser clients).
// - If allowedOrigins is empty (or contains "*"), all origins are allowed.
func CSRFOriginProtection(allowedOrigins []string) gin.HandlerFunc {
	if len(allowedOrigins) == 0 {
		return func(c *gin.Context) { c.Next() }
	}
	for _, o := range allowedOrigins {
		if strings.TrimSpace(o) == "*" {
			return func(c *gin.Context) { c.Next() }
		}
	}

	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		allowed[origin] = struct{}{}
	}

	return func(c *gin.Context) {
		method := c.Request.Method
		if method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions {
			c.Next()
			return
		}

		origin := c.Request.Header.Get("Origin")
		if origin == "" {
			c.Next()
			return
		}

		if _, ok := allowed[origin]; ok {
			c.Next()
			return
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"status":  "failed",
			"message": "invalid request origin",
		})
	}
}
