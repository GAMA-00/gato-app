# 🗺️ Project Map - Gato App

> **Última actualización:** Febrero 2026  
> **Versión:** 2.0 DOE

## 📋 Descripción General

**Gato App** es un marketplace de servicios a domicilio que conecta proveedores con clientes en residencias y condominios de Costa Rica. La plataforma soporta reservas únicas, recurrentes, pagos pre y post-servicio.

| Aspecto | Detalle |
|---------|---------|
| **Tipo** | Marketplace B2C de servicios a domicilio |
| **Stack Frontend** | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| **Stack Backend** | Supabase (PostgreSQL + Edge Functions + Auth + Storage) |
| **Pagos** | OnvoPay (Costa Rica) - Pre-pago, Post-pago, Recurrentes |
| **Emails** | Resend API |
| **Despliegue** | Lovable Cloud |
| **Timezone** | America/Mexico_City (UTC-6) |

---

## 🏗️ Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │   Pages    │  │ Components │  │   Hooks    │  │   Contexts    │  │
│  │  (35+)     │  │  (20+ dirs)│  │   (55+)    │  │ (Auth/Theme)  │  │
│  └────────────┘  └────────────┘  └────────────┘  └───────────────┘  │
│                                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                      │
│  │   Types    │  │  Services  │  │   Utils    │                      │
│  │ (Central)  │  │  (API)     │  │ (Helpers)  │                      │
│  └────────────┘  └────────────┘  └────────────┘                      │
└───────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────┐  │
│  │   PostgreSQL   │  │ Edge Functions │  │   Auth + Storage        │  │
│  │   (25+ tablas) │  │   (25+ funcs)  │  │   (JWT + Buckets)       │  │
│  │   + RLS        │  │   (Deno)       │  │                         │  │
│  └────────────────┘  └────────────────┘  └─────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    SERVICIOS EXTERNOS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │   OnvoPay    │  │    Resend    │  │   Storage    │                 │
│  │   (Pagos)    │  │   (Emails)   │  │   (Assets)   │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 👥 Roles de Usuario

| Rol | Descripción | Acceso Principal |
|-----|-------------|------------------|
| **Client** | Usuario que reserva servicios | `/client/*`, checkout, bookings |
| **Provider** | Proveedor que ofrece servicios | `/dashboard`, `/services`, `/calendar` |
| **Admin** | Administrador de plataforma | `/admin/*`, métricas, gestión |

### Flujo de Roles

```
Registro → Selección de rol → Configuración inicial → Dashboard específico
                ↓
    ┌───────────────────────────────────────┐
    │ Client: Residencia + Condominio       │
    │ Provider: Servicios + Disponibilidad  │
    │ Admin: Acceso completo                │
    └───────────────────────────────────────┘
```

---

## 📁 Estructura de Carpetas

```
gato-app/
├── docs/                         # 📚 Documentación DOE
│   ├── INDEX.md                  # Índice maestro
│   ├── PROJECT_MAP.md            # Este archivo
│   ├── FRONTEND_MAP.md           # Arquitectura frontend
│   ├── BACKEND_MAP.md            # Edge Functions + DB
│   ├── GLOSSARY.md               # Glosario de términos
│   │
│   └── skills/                   # 🛠️ Guías accionables
│       ├── SKILL_NEW_FEATURE.md
│       ├── SKILL_NEW_EDGE_FUNCTION.md
│       ├── SKILL_DATABASE_MIGRATION.md
│       ├── SKILL_DEBUG_PAYMENTS.md
│       ├── SKILL_RECURRING_APPOINTMENTS.md
│       ├── SKILL_MODIFY_UI.md
│       ├── SKILL_DESIGN_SYSTEM.md      # ← NUEVO
│       ├── SKILL_UI_PATTERNS.md        # ← NUEVO
│       └── SKILL_COMPONENT_STYLING.md  # ← NUEVO
│
├── src/                          # 🎨 Frontend
│   ├── components/               # Componentes por dominio (20+ dirs)
│   ├── pages/                    # Páginas/Rutas (35+ archivos)
│   ├── hooks/                    # Custom hooks (55+ hooks)
│   ├── contexts/                 # React Contexts (auth/)
│   ├── types/                    # TypeScript types centralizados
│   ├── services/                 # API calls organizados
│   ├── utils/                    # Funciones utilitarias
│   ├── lib/                      # Librerías compartidas
│   ├── constants/                # Constantes de app
│   └── integrations/             # Supabase client + types
│
├── supabase/                     # ⚡ Backend
│   ├── functions/                # Edge Functions (25+)
│   └── migrations/               # Migraciones SQL
│
└── public/                       # 📦 Assets estáticos
```

---

## 🔄 Flujos Principales

### 1. Reserva Normal (Pre-pago)

```
Cliente busca servicio → Selecciona proveedor → Elige slot
    │
    ▼
Checkout → onvopay-authorize → 3DS → onvopay-confirm
    │
    ▼
Appointment creada (pending) → Proveedor acepta
    │
    ▼
onvopay-capture → Pago capturado → Servicio ejecutado
    │
    ▼
Completado → Factura generada → Rating
```

### 2. Reserva Post-Pago

```
Cliente reserva (sin pago) → Proveedor acepta
    │
    ▼
Servicio ejecutado → Proveedor marca completado
    │
    ▼
onvopay-charge-post-payment → Cobro automático
    │
    ▼
Factura generada
```

### 3. Reserva Recurrente

```
Primera reserva → onvopay-initiate-recurring
    │
    ▼
Crear recurring_rule → onvopay-create-subscription
    │
    ▼
onvopay-create-loop → Loop en OnvoPay
    │
    ▼
Cobros automáticos cada ciclo (semanal/mensual)
    │
    ├─→ Instancia generada automáticamente
    ├─→ Proveedor recibe notificación
    └─→ Cliente puede saltar/reagendar
```

### 4. Generación de Slots

```
Proveedor configura disponibilidad (provider_availability)
    │
    ▼
generate_provider_time_slots_for_listing()
    │
    ▼
Slots generados 60 días adelante (timezone: America/Mexico_City)
    │
    ▼
Cliente ve slots disponibles → Reserva
    │
    ▼
Slot marcado como is_reserved = true
```

---

## 📊 Tablas Principales (DB)

### Core

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios (clientes + proveedores) |
| `listings` | Servicios publicados |
| `appointments` | Citas/Reservas |
| `provider_time_slots` | Slots de disponibilidad |

### Pagos

| Tabla | Descripción |
|-------|-------------|
| `onvopay_payments` | Registros de pago |
| `onvopay_subscriptions` | Suscripciones activas |
| `onvopay_customers` | Clientes sincronizados |
| `onvopay_webhooks` | Log de webhooks |

### Recurrencia

| Tabla | Descripción |
|-------|-------------|
| `recurring_rules` | Reglas de recurrencia |
| `recurring_instances` | Instancias generadas |
| `recurring_exceptions` | Excepciones (saltar/reagendar) |

### Ubicaciones

| Tabla | Descripción |
|-------|-------------|
| `residencias` | Residencias/Comunidades |
| `condominiums` | Condominios dentro de residencias |
| `provider_residencias` | Zonas que cubre proveedor |
| `listing_residencias` | Zonas por servicio |

### Soporte

| Tabla | Descripción |
|-------|-------------|
| `service_categories` | Categorías de servicios |
| `service_types` | Tipos de servicios |
| `team_members` | Equipo del proveedor |
| `provider_ratings` | Calificaciones |
| `invoices` | Facturas |
| `email_logs` | Log de emails |

---

## 🔐 Seguridad

### RLS (Row Level Security)

Todas las tablas tienen RLS habilitado con políticas específicas:

- **Usuarios**: Solo ven su propio perfil
- **Appointments**: Cliente ve sus reservas, Proveedor ve sus citas
- **Listings**: Proveedor gestiona sus servicios
- **Pagos**: Acceso restringido a las partes involucradas

### Archivos Críticos (NO MODIFICAR sin revisión)

```
⚠️ DO_NOT_CHANGE_BEHAVIOR:
- src/hooks/useRecurringBooking.ts
- src/utils/robustBookingSystem.ts
- src/hooks/useDashboardAppointments.ts
- src/contexts/AuthContext.tsx
- supabase/functions/onvopay-*
```

---

## 🎨 Sistema de Diseño

| Token | Uso |
|-------|-----|
| `--primary` | Color coral Gato (#de7153) |
| `--background` | Fondo principal |
| `--foreground` | Texto principal |
| `--card` | Fondo de tarjetas |
| `--muted` | Elementos secundarios |
| `--destructive` | Acciones destructivas |
| `--success` | Estados exitosos |

Ver `docs/skills/SKILL_DESIGN_SYSTEM.md` para detalles completos.

---

## 🔗 URLs del Proyecto

| Ambiente | URL |
|----------|-----|
| Preview | https://id-preview--d441b09c-5b37-4117-9726-bc80bbe1b056.lovable.app |
| Production | https://gato-app.lovable.app |
| Supabase | jckynopecuexfamepmoh.supabase.co |

---

## 📝 Convenciones

### Naming

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componentes | PascalCase | `BookingCard.tsx` |
| Hooks | camelCase + use | `useAppointments.ts` |
| Páginas | PascalCase | `ClientBookings.tsx` |
| Types | PascalCase | `AppointmentStatus` |
| Edge Functions | kebab-case | `onvopay-capture` |
| Tablas DB | snake_case | `provider_time_slots` |

### Git

- Commits en español
- Mensajes descriptivos
- Branches: `feature/`, `fix/`, `hotfix/`

---

## 🚀 Quick Start para IA

### Para implementar feature nueva:
1. Leer `PROJECT_MAP.md` (este archivo)
2. Leer `FRONTEND_MAP.md` o `BACKEND_MAP.md`
3. Seguir skill correspondiente en `docs/skills/`

### Para debug:
1. Identificar área (payments, appointments, slots)
2. Leer skill de debug relevante
3. Usar queries SQL proporcionadas

### Para modificar UI:
1. Leer `SKILL_DESIGN_SYSTEM.md`
2. Verificar tokens en `index.css`
3. NO cambiar lógica de negocio
