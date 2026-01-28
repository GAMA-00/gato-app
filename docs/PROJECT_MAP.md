# 🗺️ Project Map - Gato App

## Descripción General

**Gato App** es una plataforma de reservas de servicios a domicilio que conecta proveedores con clientes en residencias/condominios de Costa Rica.

| Aspecto | Detalle |
|---------|---------|
| **Tipo** | Marketplace de servicios a domicilio |
| **Stack Frontend** | React + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| **Stack Backend** | Supabase (PostgreSQL + Edge Functions + Auth + Storage) |
| **Pagos** | OnvoPay (Costa Rica) |
| **Despliegue** | Lovable Cloud |

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

### 1. Flujo de Reserva (Cliente)

```
1. Cliente busca servicio → /client/services
2. Selecciona proveedor → /client/providers/:id
3. Elige slot disponible → Calendar/Slot picker
4. Checkout y pago → /checkout (OnvoPay)
5. Confirmación → /booking-confirmation
```

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
| `users` | Usuarios (clientes + proveedores) |
| `listings` | Servicios publicados por proveedores |
| `appointments` | Citas/Reservas |
| `onvopay_payments` | Registros de pagos |
| `recurring_rules` | Reglas de recurrencia |
| `provider_time_slots` | Slots de disponibilidad |
| `residencias` | Residencias/Comunidades |
| `condominiums` | Condominios dentro de residencias |

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
