package app

import "github.com/gin-gonic/gin"

// Module is a small unit of application functionality that can register its
// routes under an API router group.
//
// Keep Module implementations domain-specific (e.g. "asset", "account"),
// while platform packages remain domain-agnostic.
type Module interface {
	Name() string
	RegisterRoutes(r *gin.RouterGroup)
}

// RegisterModules registers routes for each module in order.
func RegisterModules(api *gin.RouterGroup, modules ...Module) {
	for _, m := range modules {
		if m == nil {
			continue
		}
		m.RegisterRoutes(api)
	}
}
