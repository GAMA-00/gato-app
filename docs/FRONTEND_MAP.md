# 🎨 Frontend Map - Gato App

> 🐱 **Pivote v1.** El mapa de pantallas objetivo (34 vistas) está en
> [CONCEPTO_V1.md](./CONCEPTO_V1.md) §7. Esta sección documenta el estado actual de
> rutas + la navegación nueva.

## 🧭 Navegación objetivo (concepto v1)

```
LANDING (gato.app)
├── Soy Proveedor → Login OTP WhatsApp (O-1) → Onboarding (O-2…O-7) → App Proveedor
└── Soy Cliente   → Login/Registro (CO-1/CO-2) → Directorio Gato (D-1)

App Proveedor (4 tabs + 1 flotante)
├── Inicio      (H-1)  solicitudes + citas de hoy + stats de la semana
├── Agenda      (A-1…A-5)  semanal, por cantón, disponibilidad, Google Calendar
├── Solicitudes (S-1, S-2)  aceptar/rechazar/contraoferta
├── Servicio    (SE-1…SE-6)  catálogo, cantones, recordatorios, stats, suscripción
└── Mapa        (M-1)  pins por cantón, rutas, preferencias por cantón

Booking Link público  gato.app/{slug}  (BL-1…BL-6, sin login)
Directorio Gato       (D-1, D-2)
```

> Tab "Servicio" = el antiguo "Yo". Tab "Solicitudes" es nuevo. El flujo de cliente
> v1 es el **booking link**, no el checkout con pago.

## Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.3.x | UI Library |
| Vite | - | Build tool |
| TypeScript | - | Type safety |
| Tailwind CSS | - | Estilos |
| shadcn/ui | - | Componentes base |
| TanStack Query | 5.x | Data fetching/cache |
| React Router | 6.x | Routing |
| Supabase JS | 2.x | Cliente backend |

---

## 📁 Estructura de `/src`

```
src/
├── components/          # Componentes por dominio
│   ├── admin/          # Panel de administración
│   ├── appointments/   # Gestión de citas
│   ├── auth/           # Autenticación
│   ├── calendar/       # Calendario y slots
│   ├── checkout/       # Proceso de pago
│   ├── client/         # Vista de cliente
│   ├── dashboard/      # Dashboard proveedor
│   ├── invoices/       # Facturas
│   ├── payments/       # Componentes de pago
│   ├── profile/        # Perfil de usuario
│   ├── provider/       # Vista de proveedor
│   ├── services/       # Gestión de servicios
│   ├── team/           # Equipo del proveedor
│   └── ui/             # shadcn/ui components
│
├── pages/              # Páginas principales
│   ├── admin/          # Páginas de admin
│   └── *.tsx           # Páginas públicas/auth
│
├── hooks/              # Custom hooks
│   ├── admin/          # Hooks de admin
│   └── use*.ts         # Hooks generales
│
├── contexts/           # React Contexts
│   └── auth/           # Contexto de autenticación
│
├── services/           # API calls organizados
├── types/              # TypeScript definitions
├── utils/              # Funciones utilitarias
├── lib/                # Librerías compartidas
└── constants/          # Constantes de app
```

---

## 🗺️ Rutas Principales

### Rutas Públicas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | LandingPage | Página de inicio |
| `/login` | Login | Login genérico |
| `/client/login` | ClientLogin | Login cliente |
| `/provider/login` | ProviderLogin | Login proveedor |
| `/register` | Register | Registro cliente |
| `/register-provider` | ProviderRegister | Registro proveedor |
| `/forgot-password` | ForgotPassword | Recuperar contraseña |
| `/reset-password` | ResetPassword | Resetear contraseña |

### Rutas Cliente (Protegidas)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/client/services` | ClientServices | Categorías de servicios |
| `/client/category/:id` | ClientCategoryDetails | Servicios por categoría |
| `/client/providers` | ClientProvidersList | Lista de proveedores |
| `/client/provider/:id` | ClientProviderServiceDetail | Detalle de proveedor |
| `/client/bookings` | ClientBookings | Mis reservas |
| `/checkout` | Checkout | Proceso de pago |
| `/booking-confirmation` | BookingConfirmation | Confirmación |

### Rutas Proveedor (Protegidas)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/dashboard` | Dashboard | Panel principal |
| `/calendar` | Calendar | Calendario de citas |
| `/services` | Services | Mis servicios |
| `/services/create` | ServiceCreate | Crear servicio |
| `/services/:id/edit` | ServiceEdit | Editar servicio |
| `/team` | Team | Gestión de equipo |
| `/invoices` | ProviderInvoices | Facturas |

### Rutas Admin (Protegidas)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/admin/dashboard` | AdminDashboard | Dashboard admin |
| `/admin/appointments` | AdminAppointments | Todas las citas |
| `/admin/clients` | AdminClients | Gestión clientes |
| `/admin/providers` | AdminProviders | Gestión proveedores |

---

## 🪝 Hooks Principales

### Autenticación
- `useSupabaseAuth` - Manejo de sesión Supabase
- `useUserProfile` - Perfil del usuario actual

### Citas/Reservas
- `useAppointments` - CRUD de citas
- `useClientBookings` - Reservas del cliente
- `useCalendarAppointments` - Citas para calendario
- `useRecurringBooking` - Reservas recurrentes

### Servicios
- `useListings` - Listings del proveedor
- `useCategories` - Categorías de servicios
- `useServiceMutations` - Crear/editar servicios

### Disponibilidad
- `useWeeklySlotsFetcher` - Obtener slots disponibles
- `useProviderAvailability` - Configurar disponibilidad
- `useSlotGeneration` - Generar slots

### Pagos
- `usePaymentStatus` - Estado de pago
- `usePostPaymentCapture` - Capturar pago post-servicio
- `useInvoices` - Facturas

---

## 🎨 Sistema de Diseño

### Tokens de Color (index.css)

```css
:root {
  --background: /* ... */;
  --foreground: /* ... */;
  --primary: /* ... */;
  --secondary: /* ... */;
  --accent: /* ... */;
  --muted: /* ... */;
  --destructive: /* ... */;
}
```

### Componentes UI Base (shadcn)

```
src/components/ui/
├── button.tsx
├── card.tsx
├── dialog.tsx
├── input.tsx
├── select.tsx
├── toast.tsx
└── ... (40+ componentes)
```

---

## 🔐 Autenticación

### AuthContext (`src/contexts/auth/`)

```typescript
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  login: (email, password) => Promise<Result>;
  logout: () => Promise<void>;
  isLoading: boolean;
}
```

### Componentes de Protección

- `ProtectedRoute` - Requiere autenticación
- `RoleGuard` - Verifica rol específico
- `AuthRoute` - Redirige si ya autenticado

---

## 📊 Estado Global

### TanStack Query

```typescript
// Ejemplo de uso
const { data, isLoading } = useQuery({
  queryKey: ['appointments', providerId],
  queryFn: () => fetchAppointments(providerId),
});
```

### Contexts Disponibles

| Context | Propósito |
|---------|-----------|
| `AuthContext` | Usuario y sesión |
| `ThemeContext` | Tema claro/oscuro |

---

## 📝 TODOs Frontend

- [ ] TODO: Documentar todos los custom hooks
- [ ] TODO: Agregar Storybook para componentes
- [ ] TODO: Documentar flujo de estado con TanStack Query
- [ ] TODO: Agregar tests unitarios
- [ ] TODO: Documentar convenciones de naming
