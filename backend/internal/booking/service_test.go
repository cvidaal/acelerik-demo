package booking

import (
	"errors"
	"testing"
)

func TestStatusTransitions(t *testing.T) {
	cases := []struct {
		current, payment, target string
		status                   int
	}{
		{"pending", "pending", "cancelled", 0},
		{"confirmed", "paid", "cancelled", 0},
		{"confirmed", "paid", "completed", 0},
		{"cancelled", "pending", "cancelled", 0},
		{"pending", "pending", "confirmed", 409},
		{"pending", "pending", "completed", 409},
		{"confirmed", "pending", "completed", 409},
		{"cancelled", "paid", "confirmed", 409},
		{"completed", "paid", "cancelled", 409},
		{"pending", "pending", "unknown", 400},
	}
	for _, tc := range cases {
		t.Run(tc.current+"/"+tc.payment+"/"+tc.target, func(t *testing.T) {
			err := validateStatusTransition(tc.current, tc.payment, tc.target)
			if tc.status == 0 {
				if err != nil {
					t.Fatal(err)
				}
				return
			}
			var reqErr *requestError
			if !errors.As(err, &reqErr) || reqErr.status != tc.status {
				t.Fatalf("expected status %d, got %v", tc.status, err)
			}
		})
	}
}
