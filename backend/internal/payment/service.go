package payment

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/checkout/session"
)

type Service struct {
	db     *sql.DB
	key    string
	origin string
}

func NewService(db *sql.DB, key, origin string) *Service {
	return &Service{db: db, key: key, origin: strings.TrimRight(origin, "/")}
}

type RequestError struct {
	Status  int
	Message string
}

func (e *RequestError) Error() string { return e.Message }

func (s *Service) Checkout(ctx context.Context, id string) (string, error) {
	if !strings.HasPrefix(s.key, "sk_test_") {
		return "", &RequestError{503, "Stripe Test Mode no está configurado en el servidor"}
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer tx.Rollback()
	var status, payment, email string
	var amount int64
	var sessionID sql.NullString
	var created time.Time
	err = tx.QueryRowContext(ctx, `SELECT booking_status, payment_status, customer_email, deposit_amount, stripe_session_id, created_at FROM bookings WHERE id = $1 FOR UPDATE`, id).Scan(&status, &payment, &email, &amount, &sessionID, &created)
	if errors.Is(err, sql.ErrNoRows) {
		return "", &RequestError{404, "la reserva no existe"}
	}
	if err != nil {
		return "", err
	}
	if status != "pending" || payment == "paid" {
		return "", &RequestError{409, "esta reserva no admite un nuevo pago"}
	}
	backend := session.Client{B: stripe.GetBackend(stripe.APIBackend), Key: s.key}
	if sessionID.Valid {
		params := &stripe.CheckoutSessionParams{}
		params.Context = ctx
		existing, err := backend.Get(sessionID.String, params)
		if err != nil {
			return "", err
		}
		if existing.Status != stripe.CheckoutSessionStatusOpen {
			return "", &RequestError{409, "el pago está finalizado o ha caducado; consulta tu reserva"}
		}
		return existing.URL, nil
	}
	// A new Checkout needs at least 30 minutes before its Stripe expiration.
	if time.Until(created.Add(time.Hour)) < 31*time.Minute {
		return "", &RequestError{409, "el plazo para iniciar el pago ha caducado; cancela la reserva y crea otra"}
	}
	params := &stripe.CheckoutSessionParams{
		Mode:               stripe.String("payment"),
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		CustomerEmail:      stripe.String(email),
		ClientReferenceID:  stripe.String(id),
		Metadata:           map[string]string{"booking_id": id},
		SuccessURL:         stripe.String(s.origin + "/reservar?booking=" + id + "&payment=success"),
		CancelURL:          stripe.String(s.origin + "/reservar?booking=" + id + "&payment=cancelled"),
		ExpiresAt:          stripe.Int64(created.Add(time.Hour).Unix()),
		LineItems: []*stripe.CheckoutSessionLineItemParams{{
			Quantity: stripe.Int64(1),
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String("eur"), UnitAmount: stripe.Int64(amount),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{Name: stripe.String("Señal cumpleaños · Jungla Mágica")},
			},
		}},
	}
	params.Context = ctx
	params.SetIdempotencyKey("booking-checkout-" + id)
	checkout, err := backend.New(params)
	if err != nil {
		return "", err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE bookings SET stripe_session_id = $2, updated_at = now() WHERE id = $1`, id, checkout.ID); err != nil {
		return "", err
	}
	if err := tx.Commit(); err != nil {
		return "", err
	}
	return checkout.URL, nil
}

func (s *Service) ApplySession(ctx context.Context, eventType string, checkout stripe.CheckoutSession) error {
	if checkout.Livemode {
		return fmt.Errorf("live event rejected")
	}
	id := checkout.Metadata["booking_id"]
	if id == "" {
		return nil
	} // Unrelated Stripe Checkout.
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var storedSession sql.NullString
	var status, payment string
	var amount int64
	err = tx.QueryRowContext(ctx, `SELECT stripe_session_id, booking_status, payment_status, deposit_amount FROM bookings WHERE id = $1 FOR UPDATE`, id).Scan(&storedSession, &status, &payment, &amount)
	if err != nil {
		return err
	}
	if !storedSession.Valid || storedSession.String != checkout.ID {
		return fmt.Errorf("checkout session does not match booking")
	}
	switch eventType {
	case "checkout.session.completed", "checkout.session.async_payment_succeeded":
		if checkout.PaymentStatus != stripe.CheckoutSessionPaymentStatusPaid {
			return nil
		}
		if checkout.Currency != stripe.CurrencyEUR || checkout.AmountTotal != amount {
			return fmt.Errorf("checkout amount or currency mismatch")
		}
		// A late payment on a cancelled party is recorded but never reopens its slot.
		if payment != "paid" {
			if _, err := tx.ExecContext(ctx, `UPDATE bookings SET payment_status = 'paid', booking_status = CASE WHEN booking_status = 'pending' THEN 'confirmed' ELSE booking_status END, updated_at = now() WHERE id = $1`, id); err != nil {
				return err
			}
		}
	case "checkout.session.expired", "checkout.session.async_payment_failed":
		if status == "pending" && payment != "paid" {
			if _, err := tx.ExecContext(ctx, `UPDATE bookings SET payment_status = 'failed', booking_status = 'cancelled', updated_at = now() WHERE id = $1`, id); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}
