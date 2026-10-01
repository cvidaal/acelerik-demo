# 🌴 Jungla Mágica - Panel de Reservas

<div align="center">

![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![n8n](https://img.shields.io/badge/n8n-Automation-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=for-the-badge&logo=stripe&logoColor=white)

**Sistema completo de gestión de reservas para parque infantil**

[Demo](#demo) • [Características](#-características) • [Tecnologías](#-tech-stack) • [Instalación](#-instalación)

</div>

---

## 📋 Descripción

Panel de administración para gestionar reservas de cumpleaños en un parque infantil. El sistema automatiza todo el flujo desde la reserva hasta el recordatorio, incluyendo cobros online y notificaciones automáticas.

## 🎥 Demo

<div align="center">

![Dashboard Preview](https://www.loom.com/share/d0b4e7cb46d14452903e83ac6e888f02)

*Panel de administración con vista de reservas*

</div>

## ✨ Características

### 📱 Panel de Administración
- **Dashboard** con estadísticas en tiempo real
- **Calendario** visual de reservas
- **Lista de reservas** con filtros y búsqueda
- **Acciones rápidas**: llamar y WhatsApp directos
- **Estados**: Pendiente, Confirmado, Completado

### 🔄 Automatizaciones (n8n)
- ✅ Formulario de reservas con horarios dinámicos
- ✅ Cálculo automático de precios (L-J / V-D / Matinal)
- ✅ Cobro de señal online con Stripe
- ✅ Emails automáticos de confirmación
- ✅ Notificación al parque por cada reserva
- ✅ Sincronización con Google Calendar
- ✅ Recordatorio automático 2-3 días antes

### 💳 Pasarela de Pago
- Integración con **Stripe**
- Señal de 20€ (normal) o 50€ (matinal)
- Confirmación automática post-pago

## 🛠 Tech Stack

| Categoría | Tecnología |
|-----------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Estilos** | Tailwind CSS, shadcn/ui |
| **Base de datos** | Supabase (PostgreSQL) |
| **Automatización** | n8n (self-hosted) |
| **Pagos** | Stripe |
| **Calendario** | Google Calendar API |
| **Email** | Gmail API |

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Formulario  │───▶│    Stripe    │───▶│    Email     │       │
│  │   Reserva    │    │    Pago      │    │ Confirmación │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      n8n WORKFLOWS                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Procesar   │───▶│   Guardar    │───▶│   Enviar     │       │
│  │    Datos     │    │  Supabase    │    │   Emails     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                              │                                   │
│                              ▼                                   │
│                      ┌──────────────┐                           │
│                      │   Google     │                           │
│                      │  Calendar    │                           │
│                      └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PANEL ADMIN (React)                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Dashboard   │    │  Calendario  │    │   Reservas   │       │
│  │ Estadísticas │    │    Visual    │    │    Lista     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+
- Cuenta en Supabase
- n8n (self-hosted o cloud)
- Cuenta de Stripe

### 1. Clonar el repositorio

```bash
git clone https://github.com/cvidaal/jungla-admin.git
cd jungla-admin
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.template .env
```

Edita `.env` con tus credenciales:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

## 📁 Estructura del Proyecto

```
jungla-admin/
├── src/
│   ├── components/     # Componentes React
│   ├── pages/          # Páginas de la app
│   ├── lib/            # Utilidades y config
│   ├── hooks/          # Custom hooks
│   └── types/          # Tipos TypeScript
├── public/             # Assets estáticos
└── ...config files
```

## 📱 Screenshots

<div align="center">

| Dashboard | Calendario | Reservas |
|:---------:|:----------:|:--------:|
| ![Dashboard](https://via.placeholder.com/250x150/2d5a27/ffffff?text=Dashboard) | ![Calendario](https://via.placeholder.com/250x150/4a7c43/ffffff?text=Calendario) | ![Reservas](https://via.placeholder.com/250x150/68a357/ffffff?text=Reservas) |

</div>

## 🔒 Seguridad

- Autenticación con Supabase Auth
- Row Level Security (RLS) en base de datos
- Variables de entorno para credenciales
- Webhooks verificados con Stripe

## 📈 Funcionalidades Futuras

- [ ] Límite de 104 niños por día
- [ ] Gestión de festivos locales
- [ ] Exportar reservas a Excel
- [ ] App móvil para el parque
- [ ] Métricas y analytics

## 👤 Autor

**Carlos Vidal**

- GitHub: [@cvidaal](https://github.com/cvidaal)
- LinkedIn: [Tu LinkedIn](https://linkedin.com/in/tu-perfil)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">

⭐ **Si te ha gustado este proyecto, dale una estrella!** ⭐

</div>
