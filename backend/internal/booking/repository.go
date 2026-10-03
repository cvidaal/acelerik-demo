package booking

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"
)

var errSlotFull = errors.New("slot full")

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context) ([]Booking, error) {
	if err := r.expireUnpaid(ctx); err != nil {
		return nil, err
	}
	const query = `
		SELECT
			id,
			customer_name,
			customer_email,
			customer_phone,
			date,
			to_char(start_time, 'HH24:MI'),
			to_char(end_time, 'HH24:MI'),
			children,
			package,
			total_price,
			deposit_amount,
			payment_status,
			booking_status,
			stripe_session_id,
			notes,
			created_at,
			updated_at
		FROM bookings
		ORDER BY date, start_time`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	bookings := []Booking{}
	for rows.Next() {
		var (
			item   Booking
			date   time.Time
			start  string
			end    string
			stripe sql.NullString
			notes  sql.NullString
		)
		if err := rows.Scan(
			&item.ID,
			&item.CustomerName,
			&item.CustomerEmail,
			&item.CustomerPhone,
			&date,
			&start,
			&end,
			&item.Children,
			&item.Package,
			&item.TotalPrice,
			&item.DepositAmount,
			&item.PaymentStatus,
			&item.BookingStatus,
			&stripe,
			&notes,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}

		item.Date = date.Format("2006-01-02")
		item.StartTime = start
		item.EndTime = end
		if stripe.Valid {
			item.StripeSessionID = &stripe.String
		}
		if notes.Valid {
			item.Notes = &notes.String
		}
		bookings = append(bookings, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()

	for i := range bookings {
		bookings[i].BirthdayChildren = []BirthdayChild{}
	}

	if len(bookings) == 0 {
		return bookings, nil
	}

	childRows, err := r.db.QueryContext(ctx, `
	SELECT booking_id, name, age
	FROM booking_children
	ORDER BY booking_id, name, id`)
	if err != nil {
		return nil, err
	}

	defer childRows.Close()

	childrenByBooking := make(map[string][]BirthdayChild)

	for childRows.Next() {
		var (
			bookingID string
			child     BirthdayChild
			age       sql.NullInt64
		)

		if err := childRows.Scan(&bookingID, &child.Name, &age); err != nil {
			return nil, err
		}

		if age.Valid {
			value := int(age.Int64)
			child.Age = &value
		}

		childrenByBooking[bookingID] = append(
			childrenByBooking[bookingID],
			child,
		)
	}

	if err := childRows.Err(); err != nil {
		return nil, err
	}

	for i := range bookings {
		if children, ok := childrenByBooking[bookings[i].ID]; ok {
			bookings[i].BirthdayChildren = children
		}
	}

	return bookings, nil
}

func (r *Repository) Create(ctx context.Context, item Booking, maxParties int) (Booking, error) {
	if err := r.expireUnpaid(ctx); err != nil {
		return Booking{}, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Booking{}, err
	}
	defer tx.Rollback()

	// Lock the slot for the duration of the transaction
	lockKey := item.Date + " " + item.StartTime
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, lockKey); err != nil {
		return Booking{}, err
	}

	var count int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM bookings
		WHERE date = $1
		  AND start_time = $2
		  AND booking_status <> 'cancelled'`,
		item.Date, item.StartTime,
	).Scan(&count); err != nil {
		return Booking{}, err
	}
	if count >= maxParties {
		return Booking{}, errSlotFull
	}
	notes := sql.NullString{}
	if item.Notes != nil {
		notes = sql.NullString{String: *item.Notes, Valid: true}
	}
	var (
		created  Booking
		date     time.Time
		start    string
		end      string
		stripe   sql.NullString
		notesOut sql.NullString
	)
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO bookings (
			customer_name, customer_email, customer_phone,
			date, start_time, end_time,
			children, package,
			total_price, deposit_amount,
			payment_status, booking_status,
			notes
		) VALUES (
			$1, $2, $3,
			$4, $5, $6,
			$7, $8,
			$9, $10,
			'pending', 'pending',
			$11
		)
		RETURNING
			id, customer_name, customer_email, customer_phone,
			date, to_char(start_time, 'HH24:MI'), to_char(end_time, 'HH24:MI'),
			children, package,
			total_price, deposit_amount,
			payment_status, booking_status,
			stripe_session_id, notes,
			created_at, updated_at`,
		item.CustomerName, item.CustomerEmail, item.CustomerPhone,
		item.Date, item.StartTime, item.EndTime,
		item.Children, item.Package,
		item.TotalPrice, item.DepositAmount,
		notes,
	).Scan(
		&created.ID,
		&created.CustomerName,
		&created.CustomerEmail,
		&created.CustomerPhone,
		&date,
		&start,
		&end,
		&created.Children,
		&created.Package,
		&created.TotalPrice,
		&created.DepositAmount,
		&created.PaymentStatus,
		&created.BookingStatus,
		&stripe,
		&notesOut,
		&created.CreatedAt,
		&created.UpdatedAt,
	); err != nil {
		return Booking{}, err
	}
	created.Date = date.Format("2006-01-02")
	created.StartTime = start
	created.EndTime = end
	if stripe.Valid {
		created.StripeSessionID = &stripe.String
	}
	if notesOut.Valid {
		created.Notes = &notesOut.String
	}
	for _, kid := range item.BirthdayChildren {
		age := sql.NullInt64{}
		if kid.Age != nil {
			age = sql.NullInt64{Int64: int64(*kid.Age), Valid: true}
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO booking_children (booking_id, name, age)
			VALUES ($1, $2, $3)`,
			created.ID, kid.Name, age,
		); err != nil {
			return Booking{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return Booking{}, err
	}
	created.BirthdayChildren = item.BirthdayChildren
	return created, nil
}

// Get returns one party and its birthday children in a single database query.
func (r *Repository) Get(ctx context.Context, id string) (Booking, error) {
	if err := r.expireUnpaid(ctx); err != nil {
		return Booking{}, err
	}
	return getBooking(ctx, r.db, id)
}

type bookingQuerier interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func getBooking(ctx context.Context, db bookingQuerier, id string) (Booking, error) {
	var item Booking
	var childrenJSON []byte
	err := db.QueryRowContext(ctx, `
		SELECT b.id, b.customer_name, b.customer_email, b.customer_phone,
			to_char(b.date, 'YYYY-MM-DD'),
			to_char(b.start_time, 'HH24:MI'), to_char(b.end_time, 'HH24:MI'),
			b.children, b.package, b.total_price, b.deposit_amount,
			b.payment_status, b.booking_status, b.stripe_session_id, b.notes,
			b.created_at, b.updated_at,
			COALESCE((SELECT json_agg(json_build_object('name', c.name, 'age', c.age)
				ORDER BY c.name, c.id) FROM booking_children c WHERE c.booking_id = b.id), '[]'::json)
		FROM bookings b WHERE b.id = $1`, id).Scan(
		&item.ID, &item.CustomerName, &item.CustomerEmail, &item.CustomerPhone,
		&item.Date, &item.StartTime, &item.EndTime, &item.Children, &item.Package,
		&item.TotalPrice, &item.DepositAmount, &item.PaymentStatus, &item.BookingStatus,
		&item.StripeSessionID, &item.Notes, &item.CreatedAt, &item.UpdatedAt, &childrenJSON,
	)
	if err != nil {
		return Booking{}, err
	}
	if err := json.Unmarshal(childrenJSON, &item.BirthdayChildren); err != nil {
		return Booking{}, err
	}
	return item, nil
}

// The row lock keeps validation and update atomic. Business rules remain in service.
func (r *Repository) UpdateStatus(ctx context.Context, id, status string, validate func(string, string) error) (Booking, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Booking{}, err
	}
	defer tx.Rollback()
	var current, payment string
	if err := tx.QueryRowContext(ctx, `SELECT booking_status, payment_status FROM bookings WHERE id = $1 FOR UPDATE`, id).Scan(&current, &payment); err != nil {
		return Booking{}, err
	}
	if err := validate(current, payment); err != nil {
		return Booking{}, err
	}
	if current != status {
		if _, err := tx.ExecContext(ctx, `UPDATE bookings SET booking_status = $2, updated_at = now() WHERE id = $1`, id, status); err != nil {
			return Booking{}, err
		}
	}
	item, err := getBooking(ctx, tx, id)
	if err != nil {
		return Booking{}, err
	}
	if err := tx.Commit(); err != nil {
		return Booking{}, err
	}
	return item, nil
}

func (r *Repository) CountByStartTime(
	ctx context.Context,
	date string,
) (map[string]int, error) {
	if err := r.expireUnpaid(ctx); err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			to_char(start_time, 'HH24:MI'),
			COUNT(*)
		FROM bookings
		WHERE date = $1
		  AND booking_status <> 'cancelled'
		GROUP BY start_time
	`, date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)

	for rows.Next() {
		var startTime string
		var count int

		if err := rows.Scan(&startTime, &count); err != nil {
			return nil, err
		}

		counts[startTime] = count
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return counts, nil
}

// Abandoned parties without Checkout release their slot after an hour.
// Parties with a Stripe session are released by the signed expired webhook.
func (r *Repository) expireUnpaid(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `UPDATE bookings SET booking_status = 'cancelled', updated_at = now()
		WHERE booking_status = 'pending' AND payment_status <> 'paid'
		AND stripe_session_id IS NULL AND created_at < now() - interval '1 hour'`)
	return err
}
