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

	return Config{
		Port:                port,
		DatabaseURL:         withSSLMode(databaseURL),
		CORSOrigin:          origin,
		StripeSecretKey:     strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY")),
		StripeWebhookSecret: strings.TrimSpace(os.Getenv("STRIPE_WEBHOOK_SECRET")),
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
