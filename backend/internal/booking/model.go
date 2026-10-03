package booking

import "time"

// Booking is the JSON shape of one party. Money is in cents.
type Booking struct {
	ID               string          `json:"id"`
	CustomerName     string          `json:"customer_name"`
	CustomerEmail    string          `json:"customer_email"`
	CustomerPhone    string          `json:"customer_phone"`
	Date             string          `json:"date"`
	StartTime        string          `json:"start_time"`
	EndTime          string          `json:"end_time"`
	Children         int             `json:"children"`
	Package          string          `json:"package"`
	TotalPrice       int             `json:"total_price"`
	DepositAmount    int             `json:"deposit_amount"`
	PaymentStatus    string          `json:"payment_status"`
	BookingStatus    string          `json:"booking_status"`
	StripeSessionID  *string         `json:"stripe_session_id,omitempty"`
	Notes            *string         `json:"notes,omitempty"`
	BirthdayChildren []BirthdayChild `json:"birthday_children"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type BirthdayChild struct {
	Name string `json:"name"`
	Age  *int   `json:"age,omitempty"`
}

type CreateBookingRequest struct {
	CustomerName     string          `json:"customer_name"`
	CustomerEmail    string          `json:"customer_email"`
	CustomerPhone    string          `json:"customer_phone"`
	Date             string          `json:"date"`
	StartTime        string          `json:"start_time"`
	Children         int             `json:"children"`
	Package          string          `json:"package"`
	Notes            string          `json:"notes,omitempty"`
	BirthdayChildren []BirthdayChild `json:"birthday_children"`
}

type AvailabilitySlot struct {
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	Available bool   `json:"available"`
	Remaining int    `json:"remaining"`
}

type Availability struct {
	Date          string             `json:"date"`
	Slots         []AvailabilitySlot `json:"slots"`
	Package       string             `json:"package"`
	PricePerChild int                `json:"price_per_child"`
	DepositAmount int                `json:"deposit_amount"`
	MaxChildren   int                `json:"max_children"`
}
