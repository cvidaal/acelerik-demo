package payment

import (
	"crypto/hmac"
	"crypto/sha256"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"
)

func TestWebhookSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "whsec_test_only"
	body := `{"id":"evt_test","object":"event","type":"unrelated.event","data":{"object":{}}}`
	timestamp := time.Now().Unix()
	sign := func(timestamp int64, payload string) string {
		mac := hmac.New(sha256.New, []byte(secret))
		fmt.Fprintf(mac, "%d.%s", timestamp, payload)
		return fmt.Sprintf("t=%d,v1=%x", timestamp, mac.Sum(nil))
	}
	cases := []struct {
		name, payload, signature string
		status                   int
	}{
		{"missing signature", body, "", 400},
		{"signed event", body, sign(timestamp, body), 200},
		{"tampered body", body + " ", sign(timestamp, body), 400},
		{"expired signature", body, sign(timestamp-600, body), 400},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			router := gin.New()
			api := humagin.New(router, huma.DefaultConfig("Test", "1"))
			Register(api, router, NewService(nil, "", "http://localhost:8080"), secret)
			req := httptest.NewRequest(http.MethodPost, "/api/webhooks/stripe", strings.NewReader(tc.payload))
			req.Header.Set("Stripe-Signature", tc.signature)
			out := httptest.NewRecorder()
			router.ServeHTTP(out, req)
			if out.Code != tc.status {
				t.Fatalf("expected %d, got %d: %s", tc.status, out.Code, out.Body.String())
			}
		})
	}
}

func TestCheckoutRequiresTestKey(t *testing.T) {
	for _, key := range []string{"", "sk_live_forbidden"} {
		svc := NewService(nil, key, "http://localhost:8080")
		if _, err := svc.Checkout(t.Context(), "unused"); err == nil {
			t.Fatal("expected unavailable test-mode payment")
		}
	}
}
