package booking

import (
	"context"
	"errors"
	"log"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
)

type listBookingsOutput struct {
	Body []Booking
}

type getBookingInput struct {
	ID string `path:"id"`
}

type getBookingOutput struct {
	Body Booking
}

type updateStatusInput struct {
	ID   string `path:"id"`
	Body struct {
		BookingStatus string `json:"booking_status"`
	}
}

type createBookingInput struct {
	Body CreateBookingRequest
}

type createBookingOutput struct {
	Body Booking
}

type availabilityInput struct {
	Date string `query:"date" required:"true"`
}

type availabilityOutput struct {
	Body Availability
}

func Register(api huma.API, svc *Service) {
	huma.Register(api, huma.Operation{
		OperationID: "update-booking-status",
		Method:      http.MethodPatch,
		Path:        "/api/bookings/{id}/status",
	}, func(ctx context.Context, input *updateStatusInput) (*getBookingOutput, error) {
		item, err := svc.UpdateStatus(ctx, input.ID, input.Body.BookingStatus)
		if err != nil {
			var reqErr *requestError
			if errors.As(err, &reqErr) {
				return nil, huma.NewError(reqErr.status, reqErr.msg)
			}
			log.Printf("update booking status: %v", err)
			return nil, huma.Error500InternalServerError("no se pudo cambiar el estado")
		}
		return &getBookingOutput{Body: item}, nil
	})
	huma.Get(api, "/api/bookings/{id}", func(ctx context.Context, input *getBookingInput) (*getBookingOutput, error) {
		item, err := svc.Get(ctx, input.ID)
		if err != nil {
			var reqErr *requestError
			if errors.As(err, &reqErr) {
				return nil, huma.NewError(reqErr.status, reqErr.msg)
			}
			log.Printf("get booking: %v", err)
			return nil, huma.Error500InternalServerError("no se pudo consultar la reserva")
		}
		return &getBookingOutput{Body: item}, nil
	})
	huma.Get(api, "/api/bookings", func(ctx context.Context, _ *struct{}) (*listBookingsOutput, error) {
		bookings, err := svc.List(ctx)
		if err != nil {
			log.Printf("list bookings: %v", err)
			return nil, huma.Error500InternalServerError("no se pudieron cargar las reservas")
		}
		return &listBookingsOutput{Body: bookings}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "create-booking",
		Method:        http.MethodPost,
		Path:          "/api/bookings",
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *createBookingInput) (*createBookingOutput, error) {
		created, err := svc.Create(ctx, input.Body)
		if err != nil {
			var reqErr *requestError
			if errors.As(err, &reqErr) {
				return nil, huma.NewError(reqErr.status, reqErr.msg)
			}
			log.Printf("create booking: %v", err)
			return nil, huma.Error500InternalServerError("no se pudo crear la reserva")
		}
		return &createBookingOutput{Body: created}, nil
	})

	huma.Get(api, "/api/availability",
		func(ctx context.Context, input *availabilityInput) (*availabilityOutput, error) {
			result, err := svc.GetAvailability(ctx, input.Date)
			if err != nil {
				var reqErr *requestError
				if errors.As(err, &reqErr) {
					return nil, huma.NewError(reqErr.status, reqErr.msg)
				}

				log.Printf("get availability: %v", err)
				return nil, huma.Error500InternalServerError("no se pudo consultar la disponibilidad")
			}

			return &availabilityOutput{Body: result}, nil
		},
	)
}
