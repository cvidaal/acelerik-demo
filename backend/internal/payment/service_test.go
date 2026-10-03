package payment

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stripe/stripe-go/v82"
)

func TestApplySession(t *testing.T) {
	cases := []struct {
		name, event, status, payment, sessionID string
		amount                                  int64
		update, failure                         bool
	}{
		{"confirm paid party", "checkout.session.completed", "pending", "pending", "cs_test_demo", 5000, true, false},
		{"duplicate webhook", "checkout.session.completed", "confirmed", "paid", "cs_test_demo", 5000, false, false},
		{"record late cancelled payment", "checkout.session.completed", "cancelled", "pending", "cs_test_demo", 5000, true, false},
		{"reject wrong amount", "checkout.session.completed", "pending", "pending", "cs_test_demo", 100, false, true},
		{"reject wrong session", "checkout.session.completed", "pending", "pending", "cs_test_other", 5000, false, true},
		{"release expired session", "checkout.session.expired", "pending", "pending", "cs_test_demo", 5000, true, false},
		{"expiry cannot undo payment", "checkout.session.expired", "confirmed", "paid", "cs_test_demo", 5000, false, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			if err != nil {
				t.Fatal(err)
			}
			defer db.Close()
			mock.ExpectBegin()
			mock.ExpectQuery("SELECT stripe_session_id.*FOR UPDATE").WithArgs("booking-test").WillReturnRows(sqlmock.NewRows([]string{"session", "status", "payment", "amount"}).AddRow(tc.sessionID, tc.status, tc.payment, 5000))
			if tc.update {
				query := "UPDATE bookings SET payment_status = 'paid', booking_status = CASE WHEN booking_status = 'pending' THEN 'confirmed' ELSE booking_status END"
				if tc.event == "checkout.session.expired" {
					query = "UPDATE bookings SET payment_status = 'failed', booking_status = 'cancelled'"
				}
				mock.ExpectExec(query).WithArgs("booking-test").WillReturnResult(sqlmock.NewResult(0, 1))
			}
			if tc.failure {
				mock.ExpectRollback()
			} else {
				mock.ExpectCommit()
			}
			svc := NewService(db, "", "")
			err = svc.ApplySession(t.Context(), tc.event, stripe.CheckoutSession{
				ID: "cs_test_demo", Metadata: map[string]string{"booking_id": "booking-test"},
				Currency: stripe.CurrencyEUR, AmountTotal: tc.amount, PaymentStatus: stripe.CheckoutSessionPaymentStatusPaid,
			})
			if (err != nil) != tc.failure {
				t.Fatalf("unexpected error: %v", err)
			}
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}
