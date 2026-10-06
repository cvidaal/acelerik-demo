# Publicar la demo privada

Estado: el repositorio incluye la preparación del despliegue. Esto no significa que ya esté publicado.

## Un solo servicio

El Dockerfile construye React y Go. Go sirve el frontend y la API bajo el mismo dominio, sin una segunda aplicación ni VITE_API_URL. PostgreSQL continúa en Supabase.

Usar un alojamiento que admita Docker, variables privadas, un puerto HTTP y HTTPS gestionado. Seleccionar el alojamiento y su coste antes de contratar. Primero probar con su URL temporal; después conectar `demo.acelerik.com` mediante los registros DNS que indique el proveedor.

Construcción desde la raíz del repositorio:

```powershell
docker build -t acelerik-demo .
```

El contenedor escucha en PORT (8081 por defecto). El proveedor debe dirigir el tráfico HTTPS a ese puerto. Health check: GET /health.

## Vercel

Crear un proyecto nuevo llamado `acelerik-demo` conectado a este repositorio. La web principal acelerik.com tiene su propio proyecto. La raíz de la demo es la raíz del repositorio.

`vercel.json` declara un único servicio container y dirige todas las rutas a Go. `Dockerfile.vercel` contiene la misma construcción que Dockerfile. Configurar PORT=8081 también en las variables del proyecto: Vercel usa esta variable para dirigir el tráfico al contenedor.

Configurar las variables privadas de la siguiente sección antes del despliegue. Usar inicialmente la URL de producción asignada por Vercel para CORS_ORIGIN. No utilizar una URL efímera de preview para grabar el recorrido.

Comprobar el plan de la cuenta y las condiciones aplicables a uso comercial antes de contratar o activar una opción de pago. La disponibilidad y límites del runtime container deben verificarse en esa cuenta.

Guía oficial: https://vercel.com/kb/guide/deploy-go-using-docker-vercel

La contraseña de Go protege la demo. Si existe una capa de Deployment Protection adicional de Vercel, el webhook también debe poder llegar a Go: no desactivar protecciones automáticamente. Revisar el acceso a POST /api/webhooks/stripe antes de registrar el destino en Stripe.

## Variables privadas del servicio

Configurar en el alojamiento, nunca en Git ni en variables VITE_:

- DATABASE_URL: conexión Session pooler de Supabase, con sslmode=require.
- CORS_ORIGIN: URL HTTPS exacta del despliegue, sin barra final. También se usa para volver de Stripe.
- STRIPE_SECRET_KEY: clave sk_test_ de la cuenta de prueba correcta.
- STRIPE_WEBHOOK_SECRET: secreto del webhook HTTPS de ese despliegue.
- DEMO_USERNAME: usuario de acceso a la demo.
- DEMO_PASSWORD: contraseña aleatoria de al menos 16 caracteres.

STATIC_DIR=/app/public, GIN_MODE=release y TZ=Europe/Madrid ya están definidos en la imagen. PORT puede sobrescribirlo el alojamiento.

Toda la demo exige usuario y contraseña mediante la ventana del navegador, incluido el formulario de prueba y los endpoints de gestión. No es todavía un sistema de cuentas para negocios. Compartir estas credenciales únicamente con las personas invitadas a probarla. Los únicos accesos sin contraseña son GET /health y POST /api/webhooks/stripe; este último exige una firma Stripe válida.

## Webhook permanente

En la misma cuenta/sandbox que STRIPE_SECRET_KEY, crear un destino webhook HTTPS:

`https://TU-DOMINIO/api/webhooks/stripe`

Seleccionar eventos snapshot:

- checkout.session.completed
- checkout.session.expired
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed

Guardar el whsec_ de ese destino en STRIPE_WEBHOOK_SECRET del alojamiento y reiniciar/republicar el servicio. El secreto del listener local no sirve para este destino. En el despliegue no se necesita Stripe CLI ni mantener tu ordenador encendido.

Referencia oficial: https://docs.stripe.com/webhooks

## Prueba antes de grabar

1. Abrir /reservar en una ventana privada: debe solicitar credenciales.
2. Sin credenciales, GET /api/bookings debe devolver 401.
3. Entrar y crear una reserva con nombres y contacto ficticios.
4. Pagar en Stripe Test con 4242 4242 4242 4242, fecha futura y CVC de tres cifras.
5. Esperar la confirmación desde el webhook; volver desde Stripe debe recuperar la reserva.
6. Abrir /calendario y comprobar señal pagada y reserva confirmada.
7. Recargar /reservar y /calendario: ambas rutas deben funcionar directamente.

No borrar reservas ni cambiar estados de pago para hacer esta prueba. Usar exclusivamente datos ficticios. La base actual se reutiliza, por lo que sus reservas de prueba seguirán visibles.
