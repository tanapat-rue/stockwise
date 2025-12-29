package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"stockflows/server/internal/appconfig"
	"stockflows/server/internal/application"
	platformconfig "stockflows/server/platform/config"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg := platformconfig.MustLoadJSONFileFromEnv[appconfig.Config]("STOCKFLOWS_CONFIG", "config.local.json")

	start := time.Now()
	fmt.Printf("Starting StockWise API on %s...\n", cfg.HTTP.Addr)

	if err := application.Run(ctx, cfg); err != nil {
		fmt.Fprintf(os.Stderr, "server failed after %s: %v\n", time.Since(start).String(), err)
		os.Exit(1)
	}
}
