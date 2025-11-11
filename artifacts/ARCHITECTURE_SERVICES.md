# 🏗️ ARCHITECTURE - Services Layer

## Service Layer Pattern

Este proyecto sigue un patrón de **Service Layer** para centralizar la lógica de acceso a datos (Data Access Layer - DAL).

---

## Principios Fundamentales

### 1. **Separación de Responsabilidades**

```
┌─────────────────────────────────────────┐
│          UI Components/Pages             │  ← Presentación, toasts, navegación
├─────────────────────────────────────────┤
│          React Query Hooks               │  ← Caching, invalidation, loading states
├─────────────────────────────────────────┤
│          Services (DAL)                  │  ← I/O, validación, transformación
├─────────────────────────────────────────┤
│          Supabase Client                 │  ← Transporte
└─────────────────────────────────────────┘
```

### 2. **Single Responsibility per Layer**

**Services (`src/services/*.ts`):**
- ✅ Queries a Supabase
- ✅ Validación de inputs (Zod)
- ✅ Transformación de datos
- ✅ Logging con `logger`
- ❌ NO toasts ni navegación
- ❌ NO estado UI (useState, etc.)

**Hooks (`src/hooks/*.ts`, `src/components/**/use*.ts`):**
- ✅ React Query (useQuery, useMutation)
- ✅ Caching e invalidación
- ✅ Loading/error states
- ✅ Llamadas a services
- ❌ NO queries directas a Supabase
- ❌ NO lógica de negocio pesada

**Components/Pages:**
- ✅ Renderizado UI
- ✅ Toasts y feedback visual
- ✅ Navegación (useNavigate)
- ✅ Llamadas a hooks
- ❌ NO queries directas a Supabase
- ❌ NO transformación de datos

---

## Services Actuales

### 📦 ListingService (`src/services/listingService.ts`)

**Responsabilidad:** Gestión de listings/servicios

**Funciones Públicas:**

```typescript
class ListingService {
  // Get active listings (opcionalmente filtrados por provider)
  static async getActiveListings(providerId?: string): Promise<Listing[]>
  
  // Get single listing con relaciones completas
  static async getListingById(id: string): Promise<ListingWithRelations>
  
  // Update listing con validación Zod
  static async updateListing(id: string, data: UpdateListingDTO): Promise<Listing>
  
  // Get listings de un provider específico
  static async getProviderListings(providerId: string): Promise<Listing[]>
  
  // Get listing con residencias asociadas
  static async getListingWithResidencias(listingId: string): Promise<ListingWithResidencias>
  
  // Get listings básicos (lightweight, para dropdowns)
  static async getListingsBasic(providerId?: string): Promise<BasicListing[]>
  
  // Get listings activos con info de proveedor (client-facing)
  static async getActiveListingsWithProvider(serviceTypeId?: string): Promise<ListingWithProvider[]>
}
```

**DTOs:**

```typescript
// Input DTO para updates
export const UpdateListingSchema = z.object({
  title: z.string().min(1).optional(),
  base_price: z.number().positive().optional(),
  // ... más campos
});

export type UpdateListingDTO = z.infer<typeof UpdateListingSchema>;
```

**Uso desde hooks:**

```typescript
// ✅ CORRECTO
import { ListingService } from '@/services/listingService';

export const useListings = () => {
  return useQuery({
    queryKey: ['listings', providerId],
    queryFn: async () => {
      const data = await ListingService.getProviderListings(providerId);
      // Transform if needed
      return data;
    }
  });
};

// ❌ INCORRECTO
export const useListings = () => {
  return useQuery({
    queryKey: ['listings', providerId],
    queryFn: async () => {
      const { data } = await supabase.from('listings').select('*'); // ❌ Query directo
      return data;
    }
  });
};
```

---

## Contratos de Services

### Input Validation

**Todos los services DEBEN validar inputs antes de ejecutar queries:**

```typescript
static async getById(id: string) {
  // ✅ Validar UUID
  const validId = z.string().uuid().parse(id);
  
  logger.debug('Fetching record by ID', { id: validId });
  
  const { data, error } = await supabase
    .from('table')
    .eq('id', validId) // Usar input validado
    .single();
  
  if (error) {
    logger.error('Error fetching record', error);
    throw error;
  }
  
  return data;
}
```

### Error Handling

**Propagate errors, don't swallow:**

```typescript
// ✅ CORRECTO
static async getSomething(id: string) {
  const { data, error } = await supabase.from('table').select('*');
  
  if (error) {
    logger.error('Error in getSomething', error);
    throw error; // ✅ Propagar
  }
  
  return data;
}

// ❌ INCORRECTO
static async getSomething(id: string) {
  try {
    const { data, error } = await supabase.from('table').select('*');
    if (error) {
      console.log('Error:', error); // ❌ Console + swallow
      return null; // ❌ Esconder error
    }
    return data;
  } catch (e) {
    return null; // ❌ Tragar error
  }
}
```

### Logging

**Use structured logging with context:**

```typescript
// ✅ CORRECTO
logger.debug('Function called', { param1, param2 });
logger.error('Error occurred', { error, context });

// ❌ INCORRECTO
console.log('Calling function with', param1, param2); // ❌ Console
logger.debug('Error: ' + error.message); // ❌ String concat
```

---

## Patrones de Migración

### Pattern 1: Query Simple

**Antes:**
```typescript
const { data } = await supabase
  .from('listings')
  .select('*')
  .eq('provider_id', userId);
```

**Después:**
```typescript
const data = await ListingService.getProviderListings(userId);
```

### Pattern 2: Query con Transformación

**Antes:**
```typescript
const { data } = await supabase.from('listings').select('*');
const mapped = data.map(item => ({
  id: item.id,
  name: item.title,
  // ... transformación
}));
```

**Después:**
```typescript
// En service:
static async getListingsTransformed() {
  const { data, error } = await supabase.from('listings').select('*');
  if (error) throw error;
  
  return data.map(item => ({
    id: item.id,
    name: item.title,
    // ... transformación
  }));
}

// En hook:
const data = await ListingService.getListingsTransformed();
```

### Pattern 3: Mutation con Validación

**Antes:**
```typescript
const { data } = await supabase
  .from('listings')
  .update({ title: newTitle })
  .eq('id', id);
```

**Después:**
```typescript
// Validar input con Zod primero
const validated = UpdateListingSchema.parse({ title: newTitle });
const data = await ListingService.updateListing(id, validated);
```

---

## Guías de Creación de Nuevos Services

### Template Base

```typescript
/**
 * [ServiceName]Service - Data Access Layer for [Entity]
 * 
 * Centralizes all Supabase queries related to [entity].
 * 
 * IMPORTANT: This service only handles data I/O.
 * UI concerns (toasts, navigation) remain in components/hooks.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { z } from 'zod';

/**
 * DTOs
 */
export const Create[Entity]Schema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
  // ... más campos
});

export type Create[Entity]DTO = z.infer<typeof Create[Entity]Schema>;

/**
 * [ServiceName]Service - Static class
 */
export class [ServiceName]Service {
  /**
   * Get all [entities]
   * Used by: [donde se usa]
   */
  static async getAll() {
    logger.debug('getAll[Entities]');
    
    const { data, error } = await supabase
      .from('[table]')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      logger.error('getAll[Entities] - Error', error);
      throw error;
    }
    
    logger.debug(`getAll[Entities] - Fetched ${data?.length || 0} records`);
    return data || [];
  }
  
  /**
   * Get single [entity] by ID
   * Used by: [donde se usa]
   */
  static async getById(id: string) {
    // Validate input
    const validId = z.string().uuid().parse(id);
    
    logger.debug('getById[Entity]', { id: validId });
    
    const { data, error } = await supabase
      .from('[table]')
      .select('*')
      .eq('id', validId)
      .single();
    
    if (error) {
      logger.error('getById[Entity] - Error', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Create new [entity]
   * Used by: [donde se usa]
   */
  static async create(dto: Create[Entity]DTO) {
    // Validate input
    const validated = Create[Entity]Schema.parse(dto);
    
    logger.debug('create[Entity]', { data: validated });
    
    const { data, error } = await supabase
      .from('[table]')
      .insert(validated)
      .select()
      .single();
    
    if (error) {
      logger.error('create[Entity] - Error', error);
      throw error;
    }
    
    logger.debug('create[Entity] - Created', { id: data.id });
    return data;
  }
  
  // ... más métodos
}
```

### Naming Conventions

**Service files:**
- `[entity]Service.ts` (singular, PascalCase)
- Ejemplo: `appointmentService.ts`, `userService.ts`

**Function names:**
- `get[Entity]` → singular: `getAppointment(id)`
- `get[Entities]` → plural: `getAppointments()`
- `get[Entity]By[Field]` → `getAppointmentBySlot(slotId)`
- `create[Entity]` → `createAppointment(dto)`
- `update[Entity]` → `updateAppointment(id, dto)`
- `delete[Entity]` → `deleteAppointment(id)`

**DTO names:**
- `Create[Entity]DTO`
- `Update[Entity]DTO`
- `[Entity]Filter` (para queries con múltiples filtros)

---

## Checklist para Nuevos Services

Antes de crear un nuevo service:

- [ ] **Definir scope:** ¿Qué entidad/tabla cubre?
- [ ] **Definir DTOs:** Inputs y outputs tipados
- [ ] **Zod schemas:** Validación de todos los inputs
- [ ] **Logging:** `logger.debug` en entradas/salidas
- [ ] **Error handling:** Throw errors, no swallow
- [ ] **Documentación:** JSDoc en todas las funciones públicas
- [ ] **Tests:** (futuro) Unit tests para cada función

Antes de mergear:

- [ ] **No `any` en límites de módulo** (exports/DTOs)
- [ ] **No `console.*`** (solo `logger`)
- [ ] **Build passing** (TypeScript sin errores)
- [ ] **ESLint clean**
- [ ] **Smoke test:** Al menos una función usada en un hook

---

## Roadmap de Services

### ✅ Completados (PR #5)
- `ListingService` - 8 funciones (CRUD de listings)

### 🚧 En Progreso (PR #6)
- Split `useDashboardAppointments` → utils de deduplicación

### 📋 Planeados (PR #7+)
- `AppointmentService` - CRUD de appointments
- `UserService` - User profiles y settings
- `ResidenciaService` - Residencias management
- `SlotService` - Time slots y availability
- `PaymentService` - Payment operations (OnvoPay)

---

## Anti-Patterns a Evitar

### ❌ Service con Lógica UI

```typescript
// ❌ INCORRECTO
static async createAppointment(data) {
  const result = await supabase.from('appointments').insert(data);
  
  if (result.error) {
    toast.error('Error creando cita'); // ❌ Toast en service
    navigate('/appointments'); // ❌ Navegación en service
  }
  
  return result.data;
}
```

### ❌ Hook con Query Directo

```typescript
// ❌ INCORRECTO
export const useAppointments = () => {
  return useQuery({
    queryFn: async () => {
      const { data } = await supabase // ❌ Query directo
        .from('appointments')
        .select('*');
      return data;
    }
  });
};
```

### ❌ Input Sin Validar

```typescript
// ❌ INCORRECTO
static async getById(id: string) {
  const { data } = await supabase
    .from('table')
    .eq('id', id) // ❌ ID sin validar (SQL injection risk)
    .single();
  return data;
}
```

---

## Referencias

- [PR #5 - ListingService Implementation](../PR_5_MIGRATION_COMPLETE.md)
- [Security Checklist](./security/SECURITY_CHECKLIST.md)
- [Zod Documentation](https://zod.dev/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)

---

**Última actualización:** 2025-11-11  
**Owner:** Architecture Team  
**Próxima revisión:** Después de PR #6
