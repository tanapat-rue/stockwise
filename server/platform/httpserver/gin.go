package httpserver

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Options struct {
	// Mode is the Gin mode (e.g. gin.ReleaseMode). Empty means "use Gin default".
	Mode string

	// CORS is applied globally via gin-contrib/cors.
	CORS cors.Config

	// Middlewares are applied after Logger/Recovery and CORS.
	Middlewares []gin.HandlerFunc
}

// New creates a Gin engine with Logger + Recovery and applies CORS with safe defaults.
func New(opts Options) *gin.Engine {
	if opts.Mode != "" {
		gin.SetMode(opts.Mode)
	}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	corsCfg := withCORSDefaults(opts.CORS)
	r.Use(cors.New(corsCfg))

	if len(opts.Middlewares) > 0 {
		r.Use(opts.Middlewares...)
	}

	return r
}

func withCORSDefaults(cfg cors.Config) cors.Config {
	// Match the repo’s previous behavior: if no origins are configured, allow all.
	if len(cfg.AllowOrigins) == 0 && cfg.AllowOriginFunc == nil && !cfg.AllowAllOrigins {
		cfg.AllowAllOrigins = true
	}
	if len(cfg.AllowMethods) == 0 {
		cfg.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	}
	if len(cfg.AllowHeaders) == 0 {
		cfg.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-CSRF-Token", "X-Request-ID", "X-Org-Id", "X-Branch-Id"}
	}
	// Default to allowing credentials (browser cookie sessions).
	if !cfg.AllowCredentials {
		cfg.AllowCredentials = true
	}
	if cfg.MaxAge == 0 {
		cfg.MaxAge = 12 * time.Hour
	}
	return cfg
}
