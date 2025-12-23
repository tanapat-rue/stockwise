package application

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"stockflows/server/internal/appconfig"
	"stockflows/server/internal/auth"
	"stockflows/server/internal/deps"
	authmodule "stockflows/server/internal/modules/auth"
	billingmodule "stockflows/server/internal/modules/billing"
	branchesmodule "stockflows/server/internal/modules/branches"
	categoriesmodule "stockflows/server/internal/modules/categories"
	customersmodule "stockflows/server/internal/modules/customers"
	"stockflows/server/internal/modules/health"
	ordersmodule "stockflows/server/internal/modules/orders"
	orgsmodule "stockflows/server/internal/modules/orgs"
	productsmodule "stockflows/server/internal/modules/products"
	reportsmodule "stockflows/server/internal/modules/reports"
	purchaseordersmodule "stockflows/server/internal/modules/purchaseorders"
	stockmodule "stockflows/server/internal/modules/stock"
	suppliersmodule "stockflows/server/internal/modules/suppliers"
	uploadsmodule "stockflows/server/internal/modules/uploads"
	usersmodule "stockflows/server/internal/modules/users"
	"stockflows/server/internal/repo"
	platformapp "stockflows/server/platform/app"
	"stockflows/server/platform/db/mongodb"
	"stockflows/server/platform/httpserver"
	"stockflows/server/platform/middleware"
	"stockflows/server/platform/session"
	"stockflows/server/platform/storage/minio"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Run(ctx context.Context, cfg appconfig.Config) error {
	deps, cleanup, err := buildDependencies(ctx, cfg)
	if err != nil {
		return err
	}
	defer cleanup()

	router := buildRouter(deps)

	srv := &http.Server{
		Addr:              cfg.HTTP.Addr,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
		return nil
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}

func buildRouter(deps deps.Dependencies) *gin.Engine {
	corsCfg := cors.Config{
		AllowOrigins: deps.Config.HTTP.AllowedOrigins,
	}

	// Ensure cookie sessions work in the browser:
	// - With credentials, you must specify origins (or use AllowOriginFunc).
	if len(corsCfg.AllowOrigins) == 0 {
		corsCfg.AllowOriginFunc = func(origin string) bool { return origin != "" }
	}

	mode := gin.ReleaseMode
	if strings.ToLower(strings.TrimSpace(deps.Config.Env)) == "dev" || deps.Config.Env == "" {
		mode = gin.DebugMode
	}

	r := httpserver.New(httpserver.Options{
		Mode: mode,
		CORS: corsCfg,
		Middlewares: []gin.HandlerFunc{
			middleware.RequestID(),
			middleware.CSRFOriginProtection(deps.Config.HTTP.AllowedOrigins),
		},
	})
	r.Use(auth.OptionalSession(deps))

	api := r.Group("/api")
	platformapp.RegisterModules(api,
		health.New(deps),
		authmodule.New(deps),
		orgsmodule.New(deps),
		branchesmodule.New(deps),
		usersmodule.New(deps),
		categoriesmodule.New(deps),
		productsmodule.New(deps),
		stockmodule.New(deps),
		customersmodule.New(deps),
		suppliersmodule.New(deps),
		purchaseordersmodule.New(deps),
		ordersmodule.New(deps),
		uploadsmodule.New(deps),
		billingmodule.New(deps),
		reportsmodule.New(deps),
	)

	return r
}

func buildDependencies(ctx context.Context, cfg appconfig.Config) (deps.Dependencies, func(), error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	mongoClient, err := mongodb.Connect(ctx, cfg.Mongo)
	if err != nil {
		return deps.Dependencies{}, func() {}, fmt.Errorf("mongo connect: %w", err)
	}

	cleanup := func() {
		disconnectCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = mongoClient.Disconnect(disconnectCtx)
	}

	var sessStore session.Store
	switch strings.ToLower(strings.TrimSpace(cfg.Session.Store)) {
	case "", "mongodb":
		s := session.NewMongoStore(mongoClient.DB, cfg.Session.Collection, cfg.SessionTTL())
		_ = s.EnsureIndexes(context.Background())
		sessStore = s
	case "memory":
		sessStore = session.NewMemoryStore(cfg.SessionTTL())
	default:
		cleanup()
		return deps.Dependencies{}, func() {}, fmt.Errorf("invalid session.store %q", cfg.Session.Store)
	}

	var minioClient *minio.Client
	if strings.TrimSpace(cfg.MinIO.Endpoint) != "" {
		m, err := minio.New(cfg.MinIO.Config)
		if err != nil {
			cleanup()
			return deps.Dependencies{}, func() {}, fmt.Errorf("minio init: %w", err)
		}
		minioClient = m
		_ = minioClient.EnsureBucket(context.Background(), cfg.MinIO.Bucket, cfg.MinIO.Region)
	}

	appRepo := repo.New(mongoClient)
	_ = appRepo.EnsureIndexes(context.Background())
	if err := ensureSeedAdmin(context.Background(), cfg, appRepo); err != nil {
		cleanup()
		return deps.Dependencies{}, func() {}, err
	}

	return deps.Dependencies{
		Mongo:  mongoClient,
		MinIO:  minioClient,
		Sess:   sessStore,
		Repo:   appRepo,
		Config: cfg,
	}, cleanup, nil
}
