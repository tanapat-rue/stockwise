package mongodb

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

type Config struct {
	// URI takes precedence when set. If empty, Host/Username/Password are used to build one.
	URI string

	// Host can be a full Mongo URI ("mongodb://..." or "mongodb+srv://...") or a host:port.
	Host string

	Username string
	Password string

	// Database is the database name to select after connecting.
	Database string
}

type Client struct {
	Client *mongo.Client
	DB     *mongo.Database
}

func Connect(ctx context.Context, cfg Config) (*Client, error) {
	if strings.TrimSpace(cfg.Database) == "" {
		return nil, fmt.Errorf("mongodb: empty database name")
	}

	uri, err := buildURI(cfg)
	if err != nil {
		return nil, err
	}

	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}

	if err := mongoClient.Ping(ctx, readpref.Primary()); err != nil {
		_ = mongoClient.Disconnect(ctx)
		return nil, err
	}

	return &Client{
		Client: mongoClient,
		DB:     mongoClient.Database(cfg.Database),
	}, nil
}

func (c *Client) Disconnect(ctx context.Context) error {
	if c == nil || c.Client == nil {
		return nil
	}
	return c.Client.Disconnect(ctx)
}

func (c *Client) Ping(ctx context.Context) error {
	if c == nil || c.Client == nil {
		return fmt.Errorf("mongodb: nil client")
	}
	return c.Client.Ping(ctx, readpref.Primary())
}

// WaitForReady pings until success or context cancellation.
func WaitForReady(ctx context.Context, ping func(context.Context) error) error {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		if err := ping(ctx); err == nil {
			return nil
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
}

func buildURI(cfg Config) (string, error) {
	if strings.TrimSpace(cfg.URI) != "" {
		return strings.TrimSpace(cfg.URI), nil
	}

	host := strings.TrimSpace(cfg.Host)
	if host == "" {
		return "", fmt.Errorf("mongodb: empty host/uri")
	}

	if strings.HasPrefix(host, "mongodb://") || strings.HasPrefix(host, "mongodb+srv://") {
		return host, nil
	}

	// If username/password present, use SRV style by default (Atlas compatible),
	// otherwise use plain mongodb://.
	scheme := "mongodb"
	if strings.TrimSpace(cfg.Username) != "" || strings.TrimSpace(cfg.Password) != "" {
		scheme = "mongodb+srv"
	}

	u := &url.URL{
		Scheme: scheme,
		Host:   host,
	}
	if cfg.Username != "" || cfg.Password != "" {
		u.User = url.UserPassword(cfg.Username, cfg.Password)
	}
	return u.String(), nil
}
