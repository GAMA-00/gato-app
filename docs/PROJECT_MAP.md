# 🗺️ Project Map - Gato App

> 🐱 **Pivote v1 en curso.** Ver [CONCEPTO_V1.md](./CONCEPTO_V1.md) para el esquema
> completo del cambio. Este mapa describe el estado actual + hacia dónde vamos.

## Descripción General

**Gato** es un **SaaS para proveedores de servicio a domicilio independientes de Costa
Rica** (limpieza, fisioterapia, lavado de carros, belleza, jardinería). Le ordena la
agenda, automatiza recordatorios por WhatsApp, optimiza rutas por cantón y le da datos
de su negocio. El cliente reserva solo desde un **booking link público**
(`gato.app/{slug}`).

> Antes era un marketplace genérico de servicios en residencias/condominios. Ese
> modelo (residencias) **coexiste** durante la transición, pero el foco nuevo es el
> proveedor independiente y la geografía por **cantón**.

| Aspecto | Detalle |
|---------|---------|
| **Tipo** | SaaS de gestión para proveedores a domicilio (CR) |
| **Usuario primario** | Proveedor independiente con 10–40 clientes activos |
| **Stack Frontend** | React + Vite + TypeScript + Tailwind CSS + shadcn/ui (PWA) |
| **Stack Backend** | Supabase (PostgreSQL + Edge Functions + Auth + Storage) |
| **Mensajería** | WhatsApp Business Cloud API (canal único al cliente) |
| **Pagos** | OnvoPay (presente, **oculto en v1** — "sin pagos en v1") |
| **Despliegue** | Lovable Cloud |
| **Timezone** | America/Mexico_City (UTC-6) |

### Los 4 pilares del v1
1. **Agenda ordenada** — booking link + slots + buffer + solicitudes.
2. **Recordatorios automáticos** — WhatsApp 24h/2h antes y recordatorio mensual.
3. **Rutas eficientes** — recomendación de horarios por cantón + descuento por proximidad.
4. **Datos del negocio** — clientes nuevos, ganancias, recurrentes, tiempo en traslados.

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

### 1. Flujo de Reserva (Cliente) — NUEVO: Booking Link público

```
1. Cliente entra a gato.app/{slug}  → BL-1 perfil del proveedor
2. Comparte ubicación GPS + detalles → BL-2 (geocoding inverso → cantón)
3. Elige servicio(s) del catálogo    → BL-3
4. Elige fecha/hora (slots ⭐ recomendados primero) → BL-4
5. Deja nombre + WhatsApp            → BL-5
6. Confirmación + .ics               → BL-6 (sin pago en v1)
   → Crea solicitud (appointment 'pending') + WhatsApp al cliente
```

> El flujo viejo (`/client/services` → checkout OnvoPay) queda en el código pero
> **no es el camino v1**. El pago no se expone.

### 2. Flujo de Gestión (Proveedor)

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

| Tabla | Propósito |
|-------|-----------|
| `users` | Usuarios (clientes + proveedores) — 🆕 agrega `canton_base_id`, `slug` |
| `listings` | Servicios publicados por proveedores |
| `appointments` | Citas/Reservas — 🆕 agrega `canton_id`, GPS, `guest_*` |
| `onvopay_payments` | Registros de pagos (oculto en v1) |
| `recurring_rules` | Reglas de recurrencia |
| `provider_time_slots` | Slots de disponibilidad |
| `residencias` | Residencias/Comunidades (legacy, coexiste) |
| `condominiums` | Condominios dentro de residencias |
| 🆕 `provincias` | 7 provincias de CR |
| 🆕 `cantones` | 84 cantones con centroide geográfico |
| 🆕 `provider_cantones` | Zonas de trabajo del proveedor |
| 🆕 `provider_settings` | Buffer, descuentos, toggles de recordatorio |
| 🆕 `whatsapp_messages` | Log de mensajes WhatsApp (in/out) |
| 🆕 `whatsapp_otp` | Códigos OTP de login |
| 🆕 `reminder_jobs` | Cola de recordatorios programados |

> Detalle completo del modelo en [CONCEPTO_V1.md](./CONCEPTO_V1.md) §5.

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
