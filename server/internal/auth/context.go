package auth

import (
	"net/http"
	"strings"

	"stockflows/server/internal/models"

	"github.com/gin-gonic/gin"
)

func CurrentUser(c *gin.Context) *models.User {
	v, ok := c.Get(CtxUserKey)
	if !ok {
		return nil
	}
	u, ok := v.(models.User)
	if ok {
		return &u
	}
	up, ok := v.(*models.User)
	if ok {
		return up
	}
	return nil
}

func RequireRoles(roles ...models.Role) gin.HandlerFunc {
	allowed := make(map[models.Role]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}

	return func(c *gin.Context) {
		u := CurrentUser(c)
		
		if u == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		if _, ok := allowed[u.Role]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		c.Next()
	}
}

func GetOrgIDForRequest(c *gin.Context, u *models.User) string {
	if u == nil {
		return ""
	}
	if u.Role == models.RolePlatformAdmin {
		if header := strings.TrimSpace(c.GetHeader(HeaderOrgID)); header != "" {
			return header
		}
	}
	return u.OrgID
}

func GetBranchIDForRequest(c *gin.Context, u *models.User) string {
	if u == nil {
		return ""
	}
	// STAFF users are locked to their branchId.
	if u.Role == models.RoleStaff && strings.TrimSpace(u.BranchID) != "" {
		return u.BranchID
	}
	if u.Role == models.RolePlatformAdmin || u.Role == models.RoleOrgAdmin || u.Role == models.RoleBranchManager {
		if header := strings.TrimSpace(c.GetHeader(HeaderBranchID)); header != "" {
			return header
		}
	}
	if strings.TrimSpace(u.BranchID) != "" {
		return u.BranchID
	}
	return ""
}

