package payment

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/danielgtaylor/huma/v2"
	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"
)

func Register(api huma.API, router *gin.Engine, svc *Service, webhookSecret string) {
	type input struct {
		Body struct {
			BookingID string `json:"booking_id"`
		}
	}
	type output struct {
		Body struct {
			URL string `json:"url"`
		}
	}
	huma.Register(api, huma.Operation{OperationID: "create-checkout", Method: http.MethodPost, Path: "/api/payments/checkout"}, func(ctx context.Context, in *input) (*output, error) {
		id := in.Body.BookingID
		if len(id) != 36 || id[8] != '-' || id[13] != '-' || id[18] != '-' || id[23] != '-' {
			return nil, huma.Error400BadRequest("booking_id debe ser un UUID")
		}
		if decoded, err := hex.DecodeString(strings.ReplaceAll(id, "-", "")); err != nil || len(decoded) != 16 {
			return nil, huma.Error400BadRequest("booking_id debe ser un UUID")
		}
		url, err := svc.Checkout(ctx, id)
		if err != nil {
			var requestErr *RequestError
			if errors.As(err, &requestErr) {
				return nil, huma.NewError(requestErr.Status, requestErr.Message)
			}
			log.Printf("checkout: %v", err)
			return nil, huma.Error500InternalServerError("no se pudo iniciar el pago")
		}
		out := &output{}
		out.Body.URL = url
		return out, nil
	})
	router.POST("/api/webhooks/stripe", func(c *gin.Context) {
		if webhookSecret == "" {
			c.Status(http.StatusServiceUnavailable)
			return
		}
		body, err := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20))
		if err != nil {
			c.Status(http.StatusBadRequest)
			return
		}
		event, err := webhook.ConstructEventWithOptions(body, c.GetHeader("Stripe-Signature"), webhookSecret, webhook.ConstructEventOptions{IgnoreAPIVersionMismatch: true})
		if err != nil {
			c.Status(http.StatusBadRequest)
			return
		}
		switch string(event.Type) {
		case "checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired", "checkout.session.async_payment_failed":
			var checkout stripe.CheckoutSession
			if err := json.Unmarshal(event.Data.Raw, &checkout); err != nil {
				c.Status(http.StatusBadRequest)
				return
			}
			if err := svc.ApplySession(c.Request.Context(), string(event.Type), checkout); err != nil {
				log.Printf("stripe webhook: %v", err)
				c.Status(http.StatusInternalServerError)
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{"received": true})
	})
}
