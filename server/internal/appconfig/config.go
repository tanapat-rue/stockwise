package appconfig

import (
	"fmt"
	"strings"
	"time"

	"stockflows/server/platform/db/mongodb"
	"stockflows/server/platform/storage/minio"
)

type Config struct {
	Env string `json:"env"`

	HTTP HTTPConfig `json:"http"`

	Mongo mongodb.Config `json:"mongo"`

	MinIO MinIOConfig `json:"minio"`

	Session SessionConfig `json:"session"`

	Seed SeedConfig `json:"seed"`

	Omise OmiseConfig `json:"omise"`
}

type HTTPConfig struct {
	Addr           string   `json:"addr"`
	AllowedOrigins []string `json:"allowedOrigins"`

	// CookieDomain sets the cookie Domain attribute. Empty means "host-only cookie".
	CookieDomain string `json:"cookieDomain"`

	// CookieSecure sets the cookie Secure attribute.
	CookieSecure bool `json:"cookieSecure"`
}

type MinIOConfig struct {
	minio.Config

	Bucket string `json:"bucket"`
	Region string `json:"region"`

	// PublicURL is an optional base URL for generating public object URLs.
	// Example: http://localhost:9000/stockflows
	PublicURL string `json:"publicUrl"`
}

type SessionConfig struct {
	// Store can be "mongodb" or "memory".
	Store string `json:"store"`

	// Collection is used when Store == "mongodb".
	Collection string `json:"collection"`

	// TTLSeconds is the session TTL in seconds.
	TTLSeconds int `json:"ttlSeconds"`

	// CookieName is the session cookie name.
	CookieName string `json:"cookieName"`
}

type SeedConfig struct {
	Enabled bool `json:"enabled"`

	AdminEmail    string `json:"adminEmail"`
	AdminPassword string `json:"adminPassword"`
}

type OmiseConfig struct {
	PublicKey     string `json:"publicKey"`
	SecretKey     string `json:"secretKey"`
	WebhookSecret string `json:"webhookSecret"`
}

func (c Config) Validate() error {
	if strings.TrimSpace(c.HTTP.Addr) == "" {
		return fmt.Errorf("config: http.addr is required")
	}
	if strings.TrimSpace(c.Mongo.Database) == "" {
		return fmt.Errorf("config: mongo.database is required")
	}

	store := strings.ToLower(strings.TrimSpace(c.Session.Store))
	if store == "" {
		store = "mongodb"
	}
	if store != "mongodb" && store != "memory" {
		return fmt.Errorf("config: session.store must be \"mongodb\" or \"memory\"")
	}
	if store == "mongodb" && strings.TrimSpace(c.Session.Collection) == "" {
		return fmt.Errorf("config: session.collection is required when session.store=mongodb")
	}
	if c.Session.TTLSeconds < 0 {
		return fmt.Errorf("config: session.ttlSeconds must be >= 0")
	}
	if c.Session.CookieName == "" {
		return fmt.Errorf("config: session.cookieName is required")
	}

	if strings.TrimSpace(c.MinIO.Endpoint) != "" {
		if strings.TrimSpace(c.MinIO.Bucket) == "" {
			return fmt.Errorf("config: minio.bucket is required when minio.endpoint is set")
		}
		if strings.TrimSpace(c.MinIO.AccessKey) == "" || strings.TrimSpace(c.MinIO.SecretKey) == "" {
			return fmt.Errorf("config: minio.accessKey and minio.secretKey are required when minio.endpoint is set")
		}
	}

	if c.Seed.Enabled {
		if strings.TrimSpace(c.Seed.AdminEmail) == "" || strings.TrimSpace(c.Seed.AdminPassword) == "" {
			return fmt.Errorf("config: seed.adminEmail and seed.adminPassword are required when seed.enabled=true")
		}
	}

	return nil
}

func (c Config) SessionTTL() time.Duration {
	if c.Session.TTLSeconds <= 0 {
		return 7 * 24 * time.Hour
	}
	return time.Duration(c.Session.TTLSeconds) * time.Second
}

