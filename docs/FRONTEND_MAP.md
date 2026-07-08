## Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.3.x | UI Library |
| Vite | - | Build tool + HMR |
| TypeScript | - | Type safety |
| Tailwind CSS | - | Utility-first CSS |
| shadcn/ui | - | Componentes base |
| TanStack Query | 5.x | Data fetching/cache |
| React Router | 6.x | Client-side routing |
| Supabase JS | 2.x | Backend client |
| Framer Motion | - | Animaciones |
| Lucide React | - | Iconografía |
| date-fns | 4.x | Manejo de fechas |
| React Hook Form | 7.x | Forms + validación |
| Zod | 3.x | Schema validation |

---

## 📁 Estructura de `/src`

```
src/
├── components/              # Componentes por dominio
│   ├── achievements/        # Sistema de logros
│   ├── admin/               # Panel de administración
│   ├── appointments/        # Gestión de citas
│   ├── auth/                # Autenticación
│   ├── calendar/            # Calendario y slots
│   ├── checkout/            # Proceso de pago
│   ├── client/              # Vista de cliente
│   ├── common/              # Componentes compartidos
│   ├── dashboard/           # Dashboard proveedor
│   ├── debug/               # Herramientas debug
│   ├── invoices/            # Facturas
│   ├── layout/              # Layouts (nav, sidebar)
│   ├── modals/              # Modales reutilizables
│   ├── payments/            # Componentes de pago
│   ├── profile/             # Perfil de usuario
│   ├── provider/            # Vista de proveedor
│   ├── providers/           # Lista de proveedores
│   ├── services/            # Gestión de servicios
│   ├── team/                # Equipo del proveedor
│   └── ui/                  # shadcn/ui components (40+)
│
├── pages/                   # Páginas principales
│   ├── admin/               # Páginas de admin
│   └── *.tsx                # Páginas públicas/auth/client/provider
│
├── hooks/                   # Custom hooks (55+)
│   ├── admin/               # Hooks de admin
│   └── use*.ts              # Hooks generales
│
├── contexts/                # React Contexts
│   └── auth/                # Contexto de autenticación
│
├── types/                   # TypeScript definitions (centralizados)
│   ├── index.ts             # Re-exports
│   ├── booking.ts           # Tipos de reservas
│   ├── service.ts           # Tipos de servicios
│   └── location.ts          # Tipos de ubicaciones
│
├── services/                # API calls organizados
├── utils/                   # Funciones utilitarias
├── lib/                     # Librerías compartidas
├── constants/               # Constantes de app
└── integrations/            # Supabase client
    └── supabase/
        ├── client.ts        # Supabase client
        └── types.ts         # DB types (auto-generated)
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
| `/client/invoices` | ClientInvoices | Mis facturas |
| `/checkout` | Checkout | Proceso de pago |
| `/booking-confirmation` | BookingConfirmation | Confirmación de reserva |
| `/booking-summary` | BookingSummary | Resumen de reserva |
| `/recurring-booking-confirmation` | RecurringBookingConfirmation | Confirmación recurrente |

### Rutas Proveedor (Protegidas)

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/dashboard` | Dashboard | Panel principal |
| `/calendar` | Calendar | Calendario de citas |
| `/services` | Services | Mis servicios |
| `/services/create` | ServiceCreate | Crear servicio |
| `/services/:id/edit` | ServiceEdit | Editar servicio |
| `/team` | Team | Gestión de equipo |
| `/invoices` | ProviderInvoices | Mis facturas |
| `/achievements` | Achievements | Logros del proveedor |
| `/profile` | Profile | Mi perfil |

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

| Hook | Propósito |
|------|-----------|
| `useSupabaseAuth` | Manejo de sesión Supabase |
| `useUserProfile` | Perfil del usuario actual |

### Citas/Reservas

| Hook | Propósito |
|------|-----------|
| `useAppointments` | CRUD de citas |
| `useClientBookings` | Reservas del cliente |
| `useCalendarAppointments` | Citas para calendario |
| `useDashboardAppointments` | Citas del dashboard |
| `useUnifiedAppointments` | Vista unificada |
| `usePendingAppointments` | Citas pendientes |
| `useGroupedPendingRequests` | Solicitudes agrupadas |

### Recurrencia

| Hook | Propósito |
|------|-----------|
| `useRecurringBooking` | Crear reservas recurrentes |
| `useRecurringExceptions` | Excepciones (saltar/reagendar) |
| `useProviderRecurringRules` | Reglas del proveedor |
| `useCalendarRecurringSystem` | Sistema calendario |
| `useRecurringSlotSystem` | Sistema de slots |
| `useUnifiedRecurringAppointments` | Vista unificada |

### Servicios

| Hook | Propósito |
|------|-----------|
| `useListings` | Listings del proveedor |
| `useCategories` | Categorías de servicios |
| `useServiceMutations` | Crear/editar servicios |
| `useRecommendedListings` | Servicios recomendados |

### Disponibilidad y Slots

| Hook | Propósito |
|------|-----------|
| `useWeeklySlotsFetcher` | Obtener slots disponibles |
| `useProviderAvailability` | Configurar disponibilidad |
| `useSlotGeneration` | Generar slots |
| `useProviderSlotManagement` | Gestión de slots |
| `useSlotLock` | Bloqueo temporal de slots |

### Pagos

| Hook | Propósito |
|------|-----------|
| `usePaymentStatus` | Estado de pago |
| `usePaymentMethods` | Métodos de pago |
| `usePostPaymentCapture` | Capturar pago post-servicio |
| `usePostPaymentInvoices` | Facturas post-pago |
| `useInvoices` | Facturas generales |

### Ubicaciones

| Hook | Propósito |
|------|-----------|
| `useResidencias` | Residencias disponibles |
| `useCondominiums` | Condominios por residencia |

### Proveedor

| Hook | Propósito |
|------|-----------|
| `useProviderAchievements` | Logros del proveedor |
| `useProviderMerits` | Méritos acumulados |
| `useProviderComments` | Comentarios recibidos |
| `useTeamMembers` | Miembros del equipo |
| `useStats` | Estadísticas dashboard |

---

## 🎨 Sistema de Diseño

### Tokens de Color (index.css)

```css
:root {
  /* Colores principales */
  --primary: 10 68% 60%;         /* Coral Gato #de7153 */
  --primary-foreground: 0 0% 100%;
  
  /* Fondos */
  --background: 0 0% 98%;         /* Blanco suave */
  --card: 0 0% 96%;               /* Fondo tarjetas */
  --secondary: 0 0% 94%;          /* Fondo alternativo */
  
  /* Texto */
  --foreground: 20 6% 10%;        /* Texto principal */
  --muted-foreground: 0 0% 40%;   /* Texto secundario */
  
  /* Estados */
  --destructive: 0 84% 60%;       /* Rojo errores */
  --success: 142 76% 36%;         /* Verde éxito */
  --warning: 28 92% 54%;          /* Naranja alertas */
  
  /* UI */
  --border: 0 0% 88%;
  --ring: 10 68% 60%;
  --radius: 0.75rem;
  
  /* Coral variants */
  --coral: 10 68% 60%;
  --coral-light: 16 55% 64%;
  --coral-dark: 13 47% 32%;
}
```

### Componentes UI Base (shadcn)

```
src/components/ui/
├── accordion.tsx
├── alert-dialog.tsx
├── avatar.tsx
├── badge.tsx
├── button.tsx          ★ Variantes: default, outline, ghost, destructive
├── calendar.tsx
├── card.tsx            ★ Card, CardHeader, CardContent, CardFooter
├── checkbox.tsx
├── dialog.tsx          ★ Modal system
├── dropdown-menu.tsx
├── input.tsx
├── label.tsx
├── popover.tsx
├── select.tsx
├── separator.tsx
├── sheet.tsx           ★ Mobile drawers
├── skeleton.tsx
├── slider.tsx
├── switch.tsx
├── tabs.tsx
├── toast.tsx
├── toaster.tsx
└── tooltip.tsx
```

### Clases Utilitarias Custom

```css
.app-card        /* Card con estilos de marca */
.app-card-alt    /* Card alternativo */
.glassmorphism   /* Efecto glass */
.pb-safe         /* Safe area bottom */
.animate-fade-in /* Fade in animation */
.animate-slide-up /* Slide up animation */
```

---

## 🔐 Autenticación

### AuthContext (`src/contexts/auth/`)

```typescript
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  signUp: (data: SignUpData) => Promise<Result>;
}
```

### Componentes de Protección

| Componente | Propósito |
|------------|-----------|
| `ProtectedRoute` | Requiere autenticación |
| `RoleGuard` | Verifica rol específico (client/provider/admin) |
| `AuthRoute` | Redirige si ya está autenticado |
| `ErrorBoundary` | Captura errores de render |

### Flujo de Auth

```
Usuario no autenticado
         │
         ▼
    ProtectedRoute → Redirige a /login
         │
         ▼
    Login/Register → Supabase Auth
         │
         ▼
    AuthContext actualiza → user + profile
         │
         ▼
    RoleGuard verifica rol → Dashboard correspondiente
```

---

## 📊 Estado Global

### TanStack Query

```typescript
// Patrón de uso
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['appointments', providerId],
  queryFn: () => fetchAppointments(providerId),
  enabled: !!providerId,
  staleTime: 5 * 60 * 1000, // 5 minutos
});

// Mutations con invalidación
const mutation = useMutation({
  mutationFn: createAppointment,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
  },
});
```

### Query Keys Comunes

| Key | Datos |
|-----|-------|
| `['appointments', providerId]` | Citas del proveedor |
| `['bookings', clientId]` | Reservas del cliente |
| `['listings', providerId]` | Servicios del proveedor |
| `['categories']` | Categorías de servicios |
| `['slots', listingId, date]` | Slots disponibles |
| `['profile', userId]` | Perfil de usuario |

### Contexts Disponibles

| Context | Propósito |
|---------|-----------|
| `AuthContext` | Usuario y sesión |
| `ThemeContext` | Tema (via next-themes) |
| `QueryClientProvider` | TanStack Query |

---

## 📱 Responsive Design

### Breakpoints (Tailwind defaults)

| Breakpoint | Min Width | Uso |
|------------|-----------|-----|
| `sm` | 640px | Móviles grandes |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Monitores grandes |

### Patrones Mobile-First

```tsx
// Ejemplo: grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Ejemplo: padding responsive
<div className="p-4 md:p-6 lg:p-8">

// Ejemplo: ocultar en móvil
<div className="hidden md:block">
```

### Mobile Navigation

- Bottom navigation bar para client
- Hamburger menu para provider
- Safe area padding: `pb-safe`

---

## 🔧 Patrones de Código

### Estructura de Componente

```typescript
// MiComponente.tsx
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMiHook } from '@/hooks/useMiHook';

interface MiComponenteProps {
  userId: string;
  onAction?: () => void;
}

export const MiComponente = ({ userId, onAction }: MiComponenteProps) => {
  const { data, isLoading } = useMiHook(userId);
  
  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  
  return (
    <Card>
      <CardContent className="p-4">
        {/* Contenido */}
      </CardContent>
    </Card>
  );
};
```

### Estructura de Hook

```typescript
// useMiHook.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMiHook = (userId: string) => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['mi-data', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mi_tabla')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
  
  const mutation = useMutation({
    mutationFn: async (newData: MiTipo) => {
      const { data, error } = await supabase
        .from('mi_tabla')
        .insert(newData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mi-data'] });
    },
  });
  
  return {
    ...query,
    create: mutation.mutate,
    isCreating: mutation.isPending,
  };
};
```

---

## 📝 Convenciones de Código

### Naming

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componentes | PascalCase | `BookingCard.tsx` |
| Hooks | camelCase + use | `useAppointments.ts` |
| Utilities | camelCase | `formatCurrency.ts` |
| Types | PascalCase | `AppointmentStatus` |
| Constants | UPPER_SNAKE | `MAX_RETRY_ATTEMPTS` |
| CSS Classes | kebab-case | `app-card-alt` |

### Imports

```typescript
// 1. React/externos
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Componentes UI
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 3. Hooks propios
import { useAppointments } from '@/hooks/useAppointments';

// 4. Types
import type { Appointment } from '@/types';

// 5. Utilidades
import { formatDate } from '@/utils/dateUtils';
```

### Estilos

```typescript
// ✅ BIEN: Tokens semánticos
<div className="bg-background text-foreground">
<Button className="bg-primary text-primary-foreground">

// ❌ MAL: Colores directos
<div className="bg-white text-black">
<Button className="bg-blue-500 text-white">
```
