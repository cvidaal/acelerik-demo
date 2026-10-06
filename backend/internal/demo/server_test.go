package demo

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestPrivateDemoAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(Access("demo", "a-long-test-password"))
	router.Any("/*path", func(c *gin.Context) { c.Status(http.StatusNoContent) })
	for _, tc := range []struct {
		method, path, password string
		want                   int
	}{
		{"GET", "/reservar", "", 401},
		{"GET", "/api/bookings", "", 401},
		{"PATCH", "/api/bookings/id/status", "", 401},
		{"GET", "/docs", "wrong", 401},
		{"GET", "/api/bookings", "a-long-test-password", 204},
		{"GET", "/reservar", "a-long-test-password", 204},
		{"GET", "/health", "", 204},
		{"POST", "/health", "", 401},
		{"POST", "/api/webhooks/stripe", "", 204},
		{"GET", "/api/webhooks/stripe", "", 401},
	} {
		t.Run(tc.method+tc.path+tc.password, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			if tc.password != "" {
				req.SetBasicAuth("demo", tc.password)
			}
			res := httptest.NewRecorder()
			router.ServeHTTP(res, req)
			if res.Code != tc.want {
				t.Fatalf("got %d, want %d", res.Code, tc.want)
			}
		})
	}
}

func TestFrontendRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("<html>demo</html>"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "asset.js"), []byte("console.log('demo')"), 0600); err != nil {
		t.Fatal(err)
	}
	router := gin.New()
	if err := ServeFrontend(router, dir); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		path string
		want int
	}{
		{"/reservar?booking=id&payment=success", 200},
		{"/calendario", 200},
		{"/reservas", 200},
		{"/asset.js", 200},
		{"/missing.js", 404},
		{"/api/missing", 404},
		{"/../server.go", 404},
	} {
		res := httptest.NewRecorder()
		router.ServeHTTP(res, httptest.NewRequest("GET", tc.path, nil))
		if res.Code != tc.want {
			t.Fatalf("%s: got %d, want %d", tc.path, res.Code, tc.want)
		}
	}
}
