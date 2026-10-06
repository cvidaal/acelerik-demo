package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	DatabaseURL         string
	CORSOrigin          string
	StripeSecretKey     string
	StripeWebhookSecret string
	StaticDir           string
	DemoUsername        string
	DemoPassword        string
}

func Load() (Config, error) {
	_ = godotenv.Load()
	_ = godotenv.Load("backend/.env")

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8081"
	}

	origin := strings.TrimSpace(os.Getenv("CORS_ORIGIN"))
	if origin == "" {
		origin = "http://localhost:8080"
	}
	staticDir := strings.TrimSpace(os.Getenv("STATIC_DIR"))
	username := strings.TrimSpace(os.Getenv("DEMO_USERNAME"))
	password := os.Getenv("DEMO_PASSWORD")
	if (username == "") != (password == "") {
		return Config{}, fmt.Errorf("DEMO_USERNAME and DEMO_PASSWORD must be set together")
	}
	if staticDir != "" && (username == "" || len(password) < 16) {
		return Config{}, fmt.Errorf("hosted demo requires DEMO_USERNAME and DEMO_PASSWORD (at least 16 characters)")
	}

	return Config{
		Port:                port,
		DatabaseURL:         withSSLMode(databaseURL),
		CORSOrigin:          origin,
		StripeSecretKey:     strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY")),
		StripeWebhookSecret: strings.TrimSpace(os.Getenv("STRIPE_WEBHOOK_SECRET")),
		StaticDir:           staticDir,
		DemoUsername:        username,
		DemoPassword:        password,
	}, nil
}

func withSSLMode(raw string) string {
	if strings.Contains(raw, "sslmode=") {
		return raw
	}
	if strings.Contains(raw, "?") {
		return raw + "&sslmode=require"
	}
	return raw + "?sslmode=require"
}
