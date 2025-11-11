# 🚀 Preparación PR #2 y PR #3

## 📋 Overview

Con PR #1 mergeado exitosamente, ahora procedemos con:
- **PR #2**: LoadingScreen unificado
- **PR #3**: Query Invalidation Utils

Ambos pueden desarrollarse en paralelo.

---

## 🔄 PR #2 - LoadingScreen Unificado

### 🎯 Objetivo
Crear componente `LoadingScreen.tsx` centralizado y reemplazar todos los duplicados.

### 📁 Estructura del Archivo

**Crear**: `src/components/common/LoadingScreen.tsx`

```typescript
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Cargando...',
  fullScreen = true,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const containerClasses = cn(
    'flex flex-col items-center justify-center gap-4',
    fullScreen && 'min-h-screen',
    className
  );

  return (
    <div className={containerClasses}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {message && (
        <p className="text-muted-foreground text-sm">{message}</p>
      )}
    </div>
  );
};

export default LoadingScreen;
```

### 🔍 Paso 1: Buscar Duplicados

Ejecutar búsqueda de patrones de loading:

```bash
# Buscar componentes con loading states
git grep -n "Cargando" src/
git grep -n "Loading" src/
git grep -n "Loader2" src/
git grep -n "animate-spin" src/

# Buscar divs con loading
git grep -n "flex.*items-center.*justify-center" src/ | grep -i load

# Buscar isLoading conditions
git grep -n "isLoading.*return" src/
```

### 📝 Paso 2: Listar Archivos para Reemplazar

Crear lista de archivos que necesitan reemplazo:

```
Ejemplo de archivos típicos con loading duplicado:
- src/pages/Dashboard.tsx
- src/components/dashboard/DashboardLoadingState.tsx
- src/pages/Services.tsx
- src/pages/Calendar.tsx
- src/components/client/booking/NewBookingForm.tsx
- src/components/provider/services/ServiceForm.tsx
- Y muchos más...
```

### 🔄 Paso 3: Patrón de Reemplazo

**Antes**:
```typescript
if (isLoading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  );
}
```

**Después**:
```typescript
import LoadingScreen from '@/components/common/LoadingScreen';

if (isLoading) {
  return <LoadingScreen message="Cargando..." />;
}
```

### ✅ Checklist PR #2

- [ ] Crear `src/components/common/LoadingScreen.tsx`
- [ ] Agregar props: message, fullScreen, size, className
- [ ] Agregar Storybook/docs (opcional)
- [ ] Buscar todos los duplicados (git grep)
- [ ] Crear lista de ~20-40 archivos para reemplazar
- [ ] Reemplazar en batches de 10 archivos
- [ ] Ejecutar `npm run lint && npm run build`
- [ ] Smoke tests: verificar que loading states funcionan
- [ ] PR con lista completa de archivos modificados

---

## 🎯 PR #3 - Query Invalidation Utils

### 🎯 Objetivo
Centralizar invalidaciones de React Query y reducir refetches innecesarios.

### 📁 Estructura del Archivo

**Crear**: `src/utils/queryInvalidation.ts`

```typescript
/**
 * Centralización de invalidaciones de React Query
 * 
 * IMPORTANTE: NO modificar invalidaciones de flows de pagos
 */

import { QueryClient } from '@tanstack/react-query';

export interface InvalidationOptions {
  refetch?: boolean;
  exact?: boolean;
}

/**
 * Invalidaciones de Appointments
 */
export const invalidateAppointments = (
  queryClient: QueryClient,
  options: InvalidationOptions = { refetch: false }
) => {
  queryClient.invalidateQueries({ 
    queryKey: ['appointments'],
    refetchType: options.refetch ? 'active' : 'none',
    exact: options.exact 
  });
};

export const invalidateAppointmentById = (
  queryClient: QueryClient,
  appointmentId: string,
  options: InvalidationOptions = { refetch: true }
) => {
  queryClient.invalidateQueries({ 
    queryKey: ['appointments', appointmentId],
    refetchType: options.refetch ? 'active' : 'none'
  });
};

/**
 * Invalidaciones de Calendar
 */
export const invalidateCalendar = (
  queryClient: QueryClient,
  providerId?: string,
  options: InvalidationOptions = { refetch: false }
) => {
  const baseKey = ['calendar-appointments'];
  const queryKey = providerId ? [...baseKey, providerId] : baseKey;
  
  queryClient.invalidateQueries({ 
    queryKey,
    refetchType: options.refetch ? 'active' : 'none'
  });
};

/**
 * Invalidaciones de Availability
 */
export const invalidateAvailability = (
  queryClient: QueryClient,
  providerId?: string,
  options: InvalidationOptions = { refetch: false }
) => {
  queryClient.invalidateQueries({ 
    queryKey: ['provider-availability', providerId],
    refetchType: options.refetch ? 'active' : 'none'
  });
  
  queryClient.invalidateQueries({ 
    queryKey: ['provider_time_slots'],
    refetchType: 'none'
  });
};

/**
 * Invalidaciones de Listings/Services
 */
export const invalidateListings = (
  queryClient: QueryClient,
  providerId?: string,
  options: InvalidationOptions = { refetch: false }
) => {
  const baseKey = ['listings'];
  const queryKey = providerId ? [...baseKey, providerId] : baseKey;
  
  queryClient.invalidateQueries({ 
    queryKey,
    refetchType: options.refetch ? 'active' : 'none'
  });
};

/**
 * Invalidaciones de User/Profile
 */
export const invalidateUserProfile = (
  queryClient: QueryClient,
  userId?: string,
  options: InvalidationOptions = { refetch: true }
) => {
  queryClient.invalidateQueries({ 
    queryKey: ['user-profile', userId],
    refetchType: options.refetch ? 'active' : 'none'
  });
  
  queryClient.invalidateQueries({ 
    queryKey: ['provider-profile'],
    refetchType: 'none'
  });
};

/**
 * Invalidaciones de Stats/Dashboard
 */
export const invalidateStats = (
  queryClient: QueryClient,
  options: InvalidationOptions = { refetch: false }
) => {
  queryClient.invalidateQueries({ 
    queryKey: ['stats'],
    refetchType: options.refetch ? 'active' : 'none'
  });
  
  queryClient.invalidateQueries({ 
    queryKey: ['provider-merits'],
    refetchType: 'none'
  });
};

/**
 * Invalidación masiva después de cambios críticos
 * USO LIMITADO - Solo para operaciones que afectan múltiples entidades
 */
export const invalidateRelatedQueries = (
  queryClient: QueryClient,
  scope: 'booking' | 'availability' | 'profile',
  options: InvalidationOptions = { refetch: false }
) => {
  switch (scope) {
    case 'booking':
      invalidateAppointments(queryClient, { refetch: false });
      invalidateCalendar(queryClient, undefined, { refetch: false });
      invalidateStats(queryClient, options);
      break;
      
    case 'availability':
      invalidateAvailability(queryClient, undefined, { refetch: false });
      invalidateListings(queryClient, undefined, { refetch: false });
      queryClient.invalidateQueries({ 
        queryKey: ['provider_time_slots'],
        refetchType: 'none'
      });
      break;
      
    case 'profile':
      invalidateUserProfile(queryClient, undefined, options);
      invalidateListings(queryClient, undefined, { refetch: false });
      break;
  }
};

/**
 * 🚫 NO MODIFICAR - Mantener invalidaciones de pagos
 * 
 * Las siguientes invalidaciones están relacionadas con flows de pagos
 * y NO deben ser centralizadas hasta revisión completa:
 * 
 * - Invalidaciones en useRecurringBooking.ts
 * - Invalidaciones en hooks de OnvoPay
 * - Invalidaciones en componentes de post-payment
 */
```

### 🔍 Paso 1: Identificar Invalidaciones

Buscar patrones de invalidación actuales:

```bash
# Buscar invalidateQueries
git grep -n "invalidateQueries" src/

# Buscar refetchQueries
git grep -n "refetchQueries" src/

# Contar ocurrencias
git grep "invalidateQueries" src/ | wc -l
```

### 📊 Paso 2: Análisis de Patrones

Identificar patrones comunes:
- Invalidaciones después de mutations
- Invalidaciones en hooks
- Invalidaciones en contexts
- Invalidaciones redundantes

### 🔄 Paso 3: Patrón de Reemplazo

**Antes**:
```typescript
const queryClient = useQueryClient();

// Después de crear appointment
await createAppointment(data);
queryClient.invalidateQueries({ queryKey: ['appointments'] });
queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
queryClient.invalidateQueries({ queryKey: ['stats'] });
queryClient.refetchQueries({ queryKey: ['appointments'] });
```

**Después**:
```typescript
import { invalidateRelatedQueries } from '@/utils/queryInvalidation';

const queryClient = useQueryClient();

// Después de crear appointment
await createAppointment(data);
invalidateRelatedQueries(queryClient, 'booking', { refetch: false });
```

### 🚫 Exclusiones CRÍTICAS

**NO TOCAR** las siguientes invalidaciones:

1. **useRecurringBooking.ts**
   - Invalidaciones de billing OnvoPay
   - Flow de pagos recurrentes

2. **Post-payment components**
   - PostPaymentInvoicing
   - PostPaymentPricing
   - Cualquier componente con "payment" en el nombre

3. **Edge functions**
   - Funciones relacionadas con pagos
   - RPCs de billing

### ✅ Checklist PR #3

- [ ] Crear `src/utils/queryInvalidation.ts`
- [ ] Implementar funciones de invalidación por entidad
- [ ] Agregar JSDoc comments
- [ ] Buscar invalidaciones actuales (git grep)
- [ ] Crear lista de archivos para reemplazar (excluyendo pagos)
- [ ] Reemplazar en batches seguros
- [ ] Medir reducción de refetches innecesarios
- [ ] Ejecutar `npm run lint && npm run build`
- [ ] Smoke tests extensivos
- [ ] Verificar que NO se tocaron flows de pagos

---

## 📋 Orden de Ejecución Recomendado

### Opción A: Secuencial (Más Seguro)
1. ✅ PR #1 - Logging (COMPLETADO)
2. 🔄 PR #2 - LoadingScreen (próximo)
3. 🔄 PR #3 - Query Invalidation (después de PR #2)
4. 🔄 PR #1.5 - Logging resto (opcional, en paralelo)

### Opción B: Paralelo (Más Rápido)
1. ✅ PR #1 - Logging (COMPLETADO)
2. 🔄 PR #2 + PR #3 en paralelo (diferentes archivos, sin conflictos)
3. 🔄 PR #1.5 - Logging resto (en background)

**Recomendación**: Opción A para minimizar riesgos

---

## 🔒 Notas de Seguridad

### Archivos a NO Modificar en PR #2 y PR #3

1. **useRecurringBooking.ts** (DO_NOT_CHANGE_BEHAVIOR)
2. **robustBookingSystem.ts** (DO_NOT_CHANGE_BEHAVIOR)
3. **useDashboardAppointments.ts** (DO_NOT_CHANGE_BEHAVIOR)
4. **Cualquier archivo con "payment", "billing", "invoice" en el nombre**
5. **Edge functions relacionadas con pagos**
6. **RPCs de Supabase relacionadas con transacciones**

### Validación de Seguridad

Antes de cada PR:
```bash
# Verificar que no se modificaron archivos críticos
git diff --name-only | grep -E "(useRecurringBooking|robustBookingSystem|payment|billing)"

# Si este comando retorna archivos, DETENER y revisar
```

---

## 📊 Métricas de Éxito

### PR #2 - LoadingScreen
- **Archivos creados**: 1
- **Archivos modificados**: 20-40
- **Duplicados removidos**: ~20-40 bloques de loading
- **Líneas reducidas**: ~200-400 líneas
- **Tiempo estimado**: 1-2 horas

### PR #3 - Query Invalidation
- **Archivos creados**: 1
- **Archivos modificados**: 30-50
- **Invalidaciones centralizadas**: ~50-100
- **Refetches reducidos**: 30-50%
- **Tiempo estimado**: 2-3 horas

---

## 🚀 Comandos de Inicio

### Para PR #2
```bash
git checkout main
git pull
git checkout -b feature/pr2-loading-screen
touch src/components/common/LoadingScreen.tsx
# Desarrollar componente
# Buscar duplicados
# Reemplazar
git add .
git commit -m "PR #2: Unified LoadingScreen component"
git push origin feature/pr2-loading-screen
```

### Para PR #3
```bash
git checkout main
git pull
git checkout -b feature/pr3-query-invalidation
touch src/utils/queryInvalidation.ts
# Desarrollar utils
# Buscar invalidaciones
# Reemplazar (EXCEPTO pagos)
git add .
git commit -m "PR #3: Centralized query invalidation utils"
git push origin feature/pr3-query-invalidation
```

---

## 🎯 Próximos Pasos Inmediatos

1. **Ahora**: Mergear PR #1 ✅
2. **Hoy**: Crear issue para PR #1.5
3. **Hoy/Mañana**: Iniciar PR #2 (LoadingScreen)
4. **Esta semana**: Completar PR #2
5. **Próxima semana**: Iniciar PR #3 (Query Invalidation)
6. **Después**: Revisión de seguridad (SECURITY DEFINER, auth.uid(), search_path)

---

**Documento creado**: 2025-01-XX  
**Estado**: ✅ Listo para PR #2 y PR #3  
**Siguiente acción**: Iniciar desarrollo de LoadingScreen.tsx
