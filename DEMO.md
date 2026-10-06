# Demo Acelerik Booking

## Arrancar

Terminal 1, desde la raíz:

```powershell
cd backend
go run ./cmd/api
```

Terminal 2, desde la raíz:

```powershell
npm run dev
```

- Familia: http://localhost:8080/reservar
- Negocio: http://localhost:8080/
- Documentación: http://localhost:8081/docs
- Salud: http://localhost:8081/health

El frontend lee `VITE_API_URL` (por defecto http://localhost:8081). Copia `.env.example` si necesitas cambiarlo. El backend lee `backend/.env`; nunca lo subas a Git.

## Stripe de prueba

En `backend/.env`, añade:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Instala Stripe CLI siguiendo https://docs.stripe.com/stripe-cli y abre una tercera terminal:

```powershell
stripe login
stripe listen --events checkout.session.completed,checkout.session.expired,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed --forward-to localhost:8081/api/webhooks/stripe
```

Copia la clave `whsec_...` que imprime ese listener a `backend/.env` y reinicia Go. La clave del listener local puede ser diferente de la de un endpoint del Dashboard. Mantén abiertas las tres terminales mientras pruebas.

La integración solo acepta `sk_test_`. No simula pagos ni confirma desde el navegador. Si faltan claves, Checkout devuelve un error de configuración.

## Grabar el recorrido

1. Abre `/reservar`, elige una fecha futura y una franja disponible.
2. Rellena invitados, uno o varios cumpleañeros y contacto.
3. Continúa al resumen: total y señal se calculan en Go.
4. Pulsa «Reservar y pagar señal» para abrir Stripe.
5. Paga con `4242 4242 4242 4242`, fecha futura y un CVC de tres cifras, en modo prueba.
6. La página espera el webhook y muestra la confirmación.
7. Abre el panel: la tarjeta debe mostrar reserva confirmada y señal pagada. El panel refresca cada cinco segundos.

Comprueba también una franja completa (tres fiestas), una cancelación que libera plaza y un pago cancelado que permite retomar el mismo Checkout.

## Alcance

Demo local para un solo parque: pack Jungla, franjas fijas, tres fiestas por franja, máximo 25 niños. Configuración en `backend/internal/booking/config.go`.

Las reservas sin Checkout caducan después de una hora cuando se consulta el API. Stripe Checkout caduca una hora después de crear la reserva; solo se inicia mientras queden al menos 31 minutos. Su webhook de expiración cancela la reserva. Cancelar no reembolsa; un pago tardío se registra sin reactivar una fiesta cancelada.

En desarrollo local, el acceso continúa abierto si no configuras DEMO_USERNAME y DEMO_PASSWORD. Para publicar la demo privada, consulta [DEPLOY.md](DEPLOY.md): el despliegue sirve React y Go juntos y exige credenciales para todo el recorrido. No es todavía una aplicación para reservas reales.

Cuando el recorrido completo esté verificado, el siguiente paso es enseñarlo a negocios, no añadir nuevas funcionalidades.
