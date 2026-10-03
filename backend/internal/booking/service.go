package booking

import (
	"context"
	"database/sql"
	"encoding/hex"
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"
)

type requestError struct {
	status int
	msg    string
}

type Service struct {
	repo *Repository
}

func (e *requestError) Error() string {
	return e.msg
}

func NewService(repo *Repository) *Service {
	return &Service{
		repo: repo,
	}
}

func (s *Service) List(ctx context.Context) ([]Booking, error) {
	return s.repo.List(ctx)
}

func (s *Service) Get(ctx context.Context, id string) (Booking, error) {
	if err := validateBookingID(id); err != nil {
		return Booking{}, err
	}
	item, err := s.repo.Get(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return Booking{}, &requestError{status: http.StatusNotFound, msg: "la reserva no existe"}
	}
	return item, err
}

func validateBookingID(id string) error {
	// Accept the canonical UUID shape before passing it to PostgreSQL.
	if len(id) != 36 || id[8] != '-' || id[13] != '-' || id[18] != '-' || id[23] != '-' {
		return &requestError{status: http.StatusBadRequest, msg: "el ID debe ser un UUID válido"}
	}
	if raw, err := hex.DecodeString(strings.ReplaceAll(id, "-", "")); err != nil || len(raw) != 16 {
		return &requestError{status: http.StatusBadRequest, msg: "el ID debe ser un UUID válido"}
	}
	return nil
}

func validateStatusTransition(current, payment, target string) error {
	switch target {
	case BookingPending, BookingConfirmed, BookingCancelled, BookingCompleted:
		// Es un estado conocido.
	default:
		return &requestError{
			status: http.StatusBadRequest,
			msg:    "estado de reserva desconocido",
		}
	}

	// Repetir el estado actual no modifica la reserva.
	if current == target {
		return nil
	}

	if target == BookingCancelled &&
		(current == BookingPending || current == BookingConfirmed) {
		return nil
	}

	if current == BookingConfirmed &&
		payment == PaymentPaid &&
		target == BookingCompleted {
		return nil
	}

	return &requestError{
		status: http.StatusConflict,
		msg:    "no se permite ese cambio de estado",
	}
}

func (s *Service) UpdateStatus(ctx context.Context, id, status string) (Booking, error) {
	if err := validateBookingID(id); err != nil {
		return Booking{}, err
	}
	item, err := s.repo.UpdateStatus(ctx, id, status, func(current, payment string) error {
		return validateStatusTransition(current, payment, status)
	})
	if errors.Is(err, sql.ErrNoRows) {
		return Booking{}, &requestError{status: http.StatusNotFound, msg: "la reserva no existe"}
	}
	return item, err
}

func (s *Service) Create(ctx context.Context, in CreateBookingRequest) (Booking, error) {
	in.CustomerName = strings.TrimSpace(in.CustomerName)
	in.CustomerEmail = strings.TrimSpace(in.CustomerEmail)
	in.CustomerPhone = strings.TrimSpace(in.CustomerPhone)
	in.Date = strings.TrimSpace(in.Date)
	in.StartTime = strings.TrimSpace(in.StartTime)
	in.Package = strings.TrimSpace(in.Package)
	in.Notes = strings.TrimSpace(in.Notes)

	if in.CustomerName == "" || in.CustomerEmail == "" || in.CustomerPhone == "" {
		return Booking{}, &requestError{status: http.StatusBadRequest, msg: "nombre, email y teléfono son obligatorios"}
	}
	if address, err := mail.ParseAddress(in.CustomerEmail); err != nil || address.Address != in.CustomerEmail {
		return Booking{}, &requestError{status: http.StatusBadRequest, msg: "el email no es válido"}
	}
	if _, err := time.Parse("2006-01-02", in.Date); err != nil {
		return Booking{}, &requestError{status: http.StatusBadRequest, msg: "la fecha tiene que ser AAAA-MM-DD"}
	}
	location, err := time.LoadLocation("Europe/Madrid")
	if err != nil {
		return Booking{}, err
	}
	start, err := time.ParseInLocation("2006-01-02 15:04", in.Date+" "+in.StartTime, location)
	if err != nil || !start.After(time.Now()) {
		return Booking{}, &requestError{status: http.StatusBadRequest, msg: "elige una fecha y hora futuras"}
	}
	if len(in.CustomerName) > 150 || len(in.CustomerEmail) > 254 || len(in.CustomerPhone) > 30 || len(in.Notes) > 1000 {
		return Booking{}, &requestError{status: http.StatusBadRequest, msg: "alguno de los datos supera la longitud permitida"}
	}
	slot, ok := findSlot(in.StartTime)
	if !ok {
		return Booking{}, &requestError{status: http.StatusBadRequest, msg: "la hora no está disponible"}
	}
	if in.Package != packageJungla {
		return Booking{}, &requestError{status: http.StatusBadRequest, msg: "el pack no existe"}
	}
	if in.Children < 1 || in.Children > maxChildren {
		return Booking{}, &requestError{status: http.StatusBadRequest, msg: "el número de niños tiene que estar entre 1 y 25"}
	}
	if len(in.BirthdayChildren) == 0 {
		return Booking{}, &requestError{status: http.StatusBadRequest, msg: "indica al menos un cumpleañero"}
	}
	if len(in.BirthdayChildren) > in.Children {
		return Booking{}, &requestError{status: http.StatusBadRequest, msg: "el total de niños debe incluir a todos los cumpleañeros"}
	}

	kids := make([]BirthdayChild, 0, len(in.BirthdayChildren))
	for _, kid := range in.BirthdayChildren {
		kid.Name = strings.TrimSpace(kid.Name)
		if kid.Name == "" || len(kid.Name) > 100 {
			return Booking{}, &requestError{status: http.StatusBadRequest, msg: "el cumpleañero necesita nombre"}
		}
		if kid.Age != nil && (*kid.Age < 1 || *kid.Age > 18) {
			return Booking{}, &requestError{status: http.StatusBadRequest, msg: "la edad tiene que estar entre 1 y 18"}
		}
		kids = append(kids, kid)
	}
	total := in.Children * pricePerChildCents
	deposit := depositCents
	if deposit > total {
		deposit = total
	}
	item := Booking{
		CustomerName:     in.CustomerName,
		CustomerEmail:    in.CustomerEmail,
		CustomerPhone:    in.CustomerPhone,
		Date:             in.Date,
		StartTime:        in.StartTime,
		EndTime:          slot.EndTime,
		Children:         in.Children,
		Package:          in.Package,
		TotalPrice:       total,
		DepositAmount:    deposit,
		BirthdayChildren: kids,
	}
	if in.Notes != "" {
		item.Notes = &in.Notes
	}
	created, err := s.repo.Create(ctx, item, maxPartiesPerSlot)
	if errors.Is(err, errSlotFull) {
		return Booking{}, &requestError{status: http.StatusConflict, msg: "esa hora ya está completa"}
	}
	return created, err
}

func (s *Service) GetAvailability(ctx context.Context, date string) (Availability, error) {
	date = strings.TrimSpace(date)

	if _, err := time.Parse("2006-01-02", date); err != nil {
		return Availability{}, &requestError{status: http.StatusBadRequest, msg: "la fecha tiene que ser AAAA-MM-DD"}
	}

	counts, err := s.repo.CountByStartTime(ctx, date)
	if err != nil {
		return Availability{}, err
	}

	result := Availability{
		Package: packageJungla, PricePerChild: pricePerChildCents,
		DepositAmount: depositCents, MaxChildren: maxChildren,
		Date:  date,
		Slots: make([]AvailabilitySlot, 0, len(bookingSlots)),
	}

	for _, slot := range bookingSlots {
		remaining := maxPartiesPerSlot - counts[slot.StartTime]
		if remaining < 0 {
			remaining = 0
		}

		result.Slots = append(result.Slots, AvailabilitySlot{
			StartTime: slot.StartTime,
			EndTime:   slot.EndTime,
			Available: remaining > 0,
			Remaining: remaining,
		})
	}

	return result, nil
}
