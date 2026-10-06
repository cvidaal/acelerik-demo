package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"strings"
	"time"

	"acelerik-booking/internal/booking"
	"acelerik-booking/internal/config"
	"acelerik-booking/internal/demo"
	"acelerik-booking/internal/payment"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(30 * time.Minute)

	router := gin.Default()
	router.Use(demo.Access(cfg.DemoUsername, cfg.DemoPassword))
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{cfg.CORSOrigin},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodOptions},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept"},
	}))

	router.GET("/health", healthHandler(db, cfg.DatabaseURL))

	api := humagin.New(router, huma.DefaultConfig("Acelerik Booking", "0.1.0"))
	booking.Register(api, booking.NewService(booking.NewRepository(db)))
	payment.Register(api, router, payment.NewService(db, cfg.StripeSecretKey, cfg.CORSOrigin), cfg.StripeWebhookSecret)
	if cfg.StaticDir != "" {
		if err := demo.ServeFrontend(router, cfg.StaticDir); err != nil {
			log.Fatal(err)
		}
	}

	log.Printf("API listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}

func healthHandler(db *sql.DB, databaseURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.Contains(databaseURL, "YOUR-PASSWORD") {
			log.Print("database down: DATABASE_URL still has the placeholder password")
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":   "degraded",
				"database": "down",
			})
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
		defer cancel()

		if err := db.PingContext(ctx); err != nil {
			log.Printf("database down: %v", err)
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":   "degraded",
				"database": "down",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":   "ok",
			"database": "up",
		})
	}
}
