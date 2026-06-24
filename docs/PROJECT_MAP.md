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

### Los 4 pilares del v1
1. **Agenda ordenada** — booking link + slots + buffer + solicitudes.
2. **Recordatorios automáticos** — WhatsApp 24h/2h antes y recordatorio mensual.
3. **Rutas eficientes** — recomendación de horarios por cantón + descuento por proximidad.
4. **Datos del negocio** — clientes nuevos, ganancias, recurrentes, tiempo en traslados.

---

## 🏗️ Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Pages   │  │Components│  │  Hooks   │  │    Contexts      │ │
│  │ (Rutas)  │  │   (UI)   │  │ (Lógica) │  │ (Estado Global)  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  PostgreSQL  │  │ Edge Functions│  │   Auth + Storage     │  │
│  │  (Database)  │  │   (Deno)     │  │   (Usuarios/Archivos) │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICIOS EXTERNOS                           │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │   OnvoPay    │  │    Resend    │                             │
│  │   (Pagos)    │  │   (Emails)   │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👥 Roles de Usuario

| Rol | Descripción | Permisos Clave |
|-----|-------------|----------------|
| **Client** | Usuario que reserva servicios | Ver servicios, reservar, pagar, calificar |
| **Provider** | Proveedor de servicios | Crear listings, gestionar citas, recibir pagos |
| **Admin** | Administrador de plataforma | Ver todo, gestionar usuarios, métricas |

---

## 📁 Estructura de Carpetas

```
gato-app/
├── docs/                    # 📚 Documentación DOE
│   ├── PROJECT_MAP.md       # Este archivo
│   ├── FRONTEND_MAP.md      # Mapa del frontend
│   ├── BACKEND_MAP.md       # Mapa del backend
│   └── skills/              # Skills para IA
│
├── src/                     # 🎨 Código Frontend
│   ├── components/          # Componentes React
│   ├── pages/               # Páginas/Rutas
│   ├── hooks/               # Custom hooks
│   ├── contexts/            # Contextos React
│   ├── services/            # Servicios/API calls
│   ├── types/               # TypeScript types
│   ├── utils/               # Utilidades
│   ├── lib/                 # Librerías compartidas
│   └── constants/           # Constantes
│
├── supabase/                # ⚡ Backend Supabase
│   ├── functions/           # Edge Functions (Deno)
│   └── migrations/          # Migraciones SQL
│
└── public/                  # 📦 Assets estáticos
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
1. Login → /provider/login
2. Dashboard → /dashboard
3. Gestionar servicios → /services
4. Ver calendario → /calendar
5. Procesar citas → Aprobar/Rechazar/Completar
```

### 3. Flujo de Pagos

```
1. Cliente inicia pago → onvopay-authorize
2. Pago autorizado → onvopay-confirm
3. Proveedor acepta cita → onvopay-capture
4. Servicio completado → Factura generada
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

## 🔗 Enlaces Útiles

- **Preview**: https://id-preview--d441b09c-5b37-4117-9726-bc80bbe1b056.lovable.app
- **Production**: https://gato-app.lovable.app
- **Supabase Dashboard**: (requiere acceso)

---

## 📝 TODOs Pendientes

- [ ] TODO: Agregar diagrama de base de datos completo
- [ ] TODO: Documentar variables de entorno
- [ ] TODO: Agregar guía de contribución
- [ ] TODO: Documentar proceso de deployment
