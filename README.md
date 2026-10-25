# Acelerik Booking: reservas y cobro de señal para parques infantiles

Sistema de reservas de cumpleaños para un parque infantil: las familias reservan una franja, pagan una señal con Stripe y el parque gestiona las reservas desde un panel.

El repositorio tiene dos partes:

- **`backend/`**: API REST en **Go** (Gin + Huma) sobre PostgreSQL. Es la parte principal.
- **raíz (`src/`)**: panel de administración en React + TypeScript.

[![Backend (Go)](https://github.com/cvidaal/acelerik-demo/actions/workflows/backend.yml/badge.svg)](https://github.com/cvidaal/acelerik-demo/actions/workflows/backend.yml)

---

## Backend en Go

### Qué hace

- **Reservas** con una máquina de estados validada: `pending → confirmed → completed`, y `cancelled` desde pendiente o confirmada. Las transiciones no permitidas devuelven `409`.
- **Disponibilidad** por fecha para mostrar las franjas libres.
- **Cobro de señal** con Stripe Checkout. Al crear el checkout se bloquea la fila de la reserva (`SELECT … FOR UPDATE`) dentro de una transacción para evitar dos pagos de la misma reserva.
- **Webhooks de Stripe** con verificación de firma: confirman la reserva cuando se paga y la cancelan si la sesión caduca o el pago falla.
- **Documentación OpenAPI** generada por Huma en `/docs`.
- **Health check** en `/health`, que comprueba la conexión con la base de datos.

### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/availability?date=YYYY-MM-DD` | Franjas disponibles para una fecha |
| `GET` | `/api/bookings` | Lista de reservas |
| `GET` | `/api/bookings/{id}` | Detalle de una reserva |
| `POST` | `/api/bookings` | Crea una reserva (`201`) |
| `PATCH` | `/api/bookings/{id}/status` | Cambia el estado de una reserva |
| `POST` | `/api/payments/checkout` | Crea la sesión de Stripe Checkout para pagar la señal |
| `POST` | `/api/webhooks/stripe` | Recibe los eventos de Stripe |
| `GET` | `/health` | Estado de la API y de la base de datos |

### Estructura

```
backend/
├── cmd/api/            # main: configuración, router y arranque
├── internal/
│   ├── booking/        # handlers, servicio, repositorio y modelo de reservas
│   ├── payment/        # checkout y webhooks de Stripe
│   └── config/         # variables de entorno
└── migrations/         # esquema SQL
```

Cada módulo separa **handler** (HTTP), **servicio** (reglas de negocio) y **repositorio** (SQL con pgx).

### Arrancar con Docker

```bash
docker compose up --build
```

Levanta PostgreSQL con las migraciones aplicadas y la API en http://localhost:8081 (documentación en http://localhost:8081/docs). Para probar pagos, exporta `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` de **Stripe Test Mode** antes de arrancar.

### Arrancar sin Docker

```bash
cd backend
cp .env.example .env   # rellena DATABASE_URL y, si quieres pagos, las claves de Stripe Test Mode
go run ./cmd/api
```

Más detalles sobre Stripe CLI y el recorrido completo de la demo en [DEMO.md](DEMO.md).

### Tests

```bash
cd backend
go test ./...
```

Tests unitarios table-driven de las transiciones de estado, del servicio de pagos y del handler de webhooks. Se ejecutan en cada push con GitHub Actions.

### Stack

Go · Gin · Huma (OpenAPI) · PostgreSQL · pgx · Stripe · Docker · GitHub Actions

---

## Panel de administración (frontend)

Panel en React para gestionar las reservas del parque.

- Dashboard con estadísticas de reservas.
- Calendario visual y lista de reservas con filtros y búsqueda.
- Acciones rápidas: llamar y WhatsApp directos.
- Página pública de reserva para las familias (`/reservar`).

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui

```bash
npm install
npm run dev
```

El frontend lee `VITE_API_URL` (por defecto http://localhost:8081).

### Automatizaciones (n8n)

El flujo completo del parque se complementa con workflows de n8n: emails de confirmación, notificación al parque, sincronización con Google Calendar y recordatorio 2–3 días antes de la reserva.

---

## Autor

**Carlos Vidal**: [GitHub](https://github.com/cvidaal) · [LinkedIn](https://www.linkedin.com/in/carlosvidaldev)
