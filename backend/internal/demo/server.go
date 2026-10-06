package demo

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// Access protects the entire private demo, including the API and documentation.
// Stripe authenticates its public webhook using the signature in payment.Register.
func Access(username, password string) gin.HandlerFunc {
	if username == "" || password == "" {
		return func(c *gin.Context) { c.Next() }
	}
	auth := gin.BasicAuth(gin.Accounts{username: password})
	return func(c *gin.Context) {
		if (c.Request.Method == http.MethodGet && c.Request.URL.Path == "/health") ||
			(c.Request.Method == http.MethodPost && c.Request.URL.Path == "/api/webhooks/stripe") {
			c.Next()
			return
		}
		c.Header("Cache-Control", "no-store")
		c.Header("X-Robots-Tag", "noindex, nofollow")
		auth(c)
	}
}

// ServeFrontend serves the Vite build and React routes from the same Go process.
func ServeFrontend(router *gin.Engine, dir string) error {
	root, err := filepath.Abs(dir)
	if err != nil {
		return err
	}
	index := filepath.Join(root, "index.html")
	if _, err := os.Stat(index); err != nil {
		return fmt.Errorf("frontend build not found: %w", err)
	}
	files := http.FileServer(http.Dir(root))
	router.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			c.Status(http.StatusNotFound)
			return
		}
		// Never return HTML for a misspelled API or missing asset.
		if path == "/api" || strings.HasPrefix(path, "/api/") {
			c.Status(http.StatusNotFound)
			return
		}
		if path == "/" || path == "/reservar" || path == "/calendario" || path == "/reservas" {
			c.File(index)
			return
		}
		files.ServeHTTP(c.Writer, c.Request)
	})
	return nil
}
