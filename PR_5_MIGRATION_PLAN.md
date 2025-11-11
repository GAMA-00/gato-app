# PR #5 - ListingService Migration Plan

## 📊 Archivos Encontrados: 22 archivos con queries de listings

### 🎯 Prioridad 1 - MIGRAR AHORA (Bajo Riesgo, Alto Impacto)

#### 1. useListings.ts (Hook READ-ONLY)
**Riesgo**: ⭐ Muy Bajo  
**Query**: `SELECT * FROM listings` con filtros  
**Función a usar**: `ListingService.getActiveListings(providerId?)`  
**Beneficio**: Hook usado en múltiples componentes

#### 2. ClientProvidersList.tsx (Página pública)
**Riesgo**: ⭐ Muy Bajo  
**Query**: Listings activos con service_types  
**Función a usar**: `ListingService.getActiveListings()`  
**Beneficio**: Página cliente-facing, no auth compleja

#### 3. ClientServiceDetail.tsx (Detalle servicio)
**Riesgo**: ⭐ Muy Bajo  
**Query**: Single listing con relaciones  
**Función a usar**: `ListingService.getListingById(id)`  
**Beneficio**: Página crítica de conversión

#### 4. Services.tsx (Provider dashboard)
**Riesgo**: ⭐⭐ Bajo  
**Query**: Provider listings  
**Función a usar**: `ListingService.getProviderListings(providerId)`  
**Beneficio**: Dashboard de provider

#### 5. ProviderProfile.tsx (Perfil público)
**Riesgo**: ⭐ Muy Bajo  
**Query**: Listings de un provider específico  
**Función a usar**: `ListingService.getProviderListings(providerId)`  
**Beneficio**: SEO-friendly page

---

### 🔄 Prioridad 2 - MIGRAR DESPUÉS (Riesgo Medio)

#### 6. useServiceDetail.ts (Hook con caché)
**Riesgo**: ⭐⭐ Bajo  
**Query**: Similar a getListingById  
**Función a usar**: `ListingService.getListingById(id)`  
**Nota**: Verificar caché de React Query

#### 7. useProvidersQuery.ts (Hook de búsqueda)
**Riesgo**: ⭐⭐ Bajo  
**Query**: Listings con filtros complejos  
**Función a usar**: `ListingService.getActiveListings()`  
**Nota**: Puede necesitar filtrado adicional

#### 8. ServiceEdit.tsx (Edición servicio)
**Riesgo**: ⭐⭐⭐ Medio  
**Query**: Fetch + Update  
**Funciones a usar**: `getListingById`, `updateListing`  
**Nota**: Verificar invalidación de caché

---

### ⚠️ Prioridad 3 - REVISAR CON CUIDADO (Riesgo Alto)

#### 9. useServiceMutations.ts (CRUD completo)
**Riesgo**: ⭐⭐⭐⭐ Alto  
**Query**: INSERT, UPDATE, DELETE  
**Nota**: Requiere funciones adicionales en service (create, delete)  
**Decisión**: **Postponer a PR futura**

#### 10. UnifiedAvailabilityContext.tsx (Context con state)
**Riesgo**: ⭐⭐⭐⭐ Alto  
**Query**: Updates complejos de availability  
**Nota**: Context crítico con múltiples consumers  
**Decisión**: **Postponer a PR futura**

#### 11. useAvailabilitySync.ts (Sincronización)
**Riesgo**: ⭐⭐⭐⭐ Alto  
**Query**: Updates + selects de availability  
**Nota**: Lógica de sincronización compleja  
**Decisión**: **Postponer a PR futura**

---

### 🚫 NO MIGRAR AHORA (Riesgo Crítico o Fuera de Scope)

#### ❌ useRecurringBooking.ts
**Razón**: Flujo crítico de pagos (aunque solo sea lectura)  
**Query**: Solo lectura de `listing.provider_id, title`  
**Decisión**: **Muy Bajo impacto, alto riesgo. NO migrar en PR #5**

#### ❌ useCalendarRecurringSystem.ts
**Razón**: Sistema complejo de calendario  
**Query**: Lecturas en contexto de appointments  
**Decisión**: **Postponer a revisión de calendar system**

#### ❌ RescheduleAppointmentModal.tsx
**Razón**: Flujo de reschedule crítico  
**Query**: Solo `standard_duration, duration`  
**Decisión**: **Bajo impacto, postponer**

#### ❌ utils/ files (slotSyncUtils, unifiedAvailabilityTester)
**Razón**: Utilidades internas, no user-facing  
**Decisión**: **Postponer a refactor de utils**

---

## 📋 Plan de Ejecución PR #5

### Fase 1: Migraciones Seguras (Este PR) ✅
1. ✅ `useListings.ts` → `getActiveListings`
2. ✅ `ClientProvidersList.tsx` → `getActiveListings`
3. ✅ `ClientServiceDetail.tsx` → `getListingById`
4. ✅ `Services.tsx` → `getProviderListings`
5. ✅ `ProviderProfile.tsx` → `getProviderListings`

**Total**: 5 archivos  
**Riesgo**: Bajo  
**Testing**: Smoke tests cliente y provider  

### Fase 2: Hooks Intermedios (PR futuro)
6. `useServiceDetail.ts`
7. `useProvidersQuery.ts`
8. `ServiceEdit.tsx`

**Total**: 3 archivos  
**Riesgo**: Medio  

### Fase 3: Mutations y Context (PR futuro)
9. `useServiceMutations.ts` (requiere create/delete en service)
10. `UnifiedAvailabilityContext.tsx`
11. `useAvailabilitySync.ts`

**Total**: 3 archivos  
**Riesgo**: Alto  

---

## ✅ Checklist de Migración por Archivo

### ✅ useListings.ts
- [ ] Leer archivo actual
- [ ] Identificar query pattern
- [ ] Reemplazar con `ListingService.getActiveListings`
- [ ] Mantener filtros y ordenamiento
- [ ] Verificar staleTime
- [ ] Test: Provider → Mis Servicios

### ✅ ClientProvidersList.tsx
- [ ] Leer archivo actual
- [ ] Identificar query pattern
- [ ] Reemplazar con `ListingService.getActiveListings`
- [ ] Mantener lógica de categorías
- [ ] Test: Cliente → Buscar Servicios

### ✅ ClientServiceDetail.tsx
- [ ] Leer archivo actual
- [ ] Identificar query pattern
- [ ] Reemplazar con `ListingService.getListingById`
- [ ] Mantener relaciones (provider info)
- [ ] Test: Cliente → Ver Detalle Servicio

### ✅ Services.tsx
- [ ] Leer archivo actual
- [ ] Identificar query pattern
- [ ] Reemplazar con `ListingService.getProviderListings`
- [ ] Mantener filtros activo/inactivo
- [ ] Test: Provider → Dashboard Servicios

### ✅ ProviderProfile.tsx
- [ ] Leer archivo actual
- [ ] Identificar query pattern
- [ ] Reemplazar con `ListingService.getProviderListings`
- [ ] Test: Ver Perfil Público de Provider

---

## 🧪 Smoke Tests Post-Migración

### Test Suite 1: Cliente
1. Buscar servicios → `ClientProvidersList.tsx`
2. Ver detalle de servicio → `ClientServiceDetail.tsx`
3. Ver perfil de provider → `ProviderProfile.tsx`
4. Iniciar booking → Verificar datos correctos

### Test Suite 2: Provider
1. Login → Dashboard
2. Ver "Mis Servicios" → `Services.tsx`, `useListings.ts`
3. Editar servicio (si migrado)
4. Ver perfil público propio

### Test Suite 3: Performance
1. DevTools → Network
2. Contar requests a `/rest/v1/listings`
3. Verificar: MISMO número que antes
4. Verificar: Queries con select optimizado

---

## 📊 Impacto Esperado

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Archivos con queries inline | 22 | 17 | -5 ✅ |
| Funciones service | 0 | 7 | +7 ✅ |
| Queries centralizadas | 0% | ~23% | +23% ✅ |
| Código duplicado | ~150 LOC | ~50 LOC | -67% ✅ |

---

## 🚦 Gate Decision

**Migrar en PR #5**: 5 archivos (Fase 1)  
**Postponer**: 17 archivos (Fases 2 y 3)

**Razón**: Minimizar riesgo, maximizar aprendizaje, validar patrón de service layer.

---

## 📝 Siguiente Acción

1. **AHORA**: Migrar Fase 1 (5 archivos)
2. **Smoke tests**: Cliente y Provider
3. **Security check**: DEFINER functions
4. **Merge PR #5**
5. **DESPUÉS**: Planear PR #6 (Dashboard split)

---

**Fecha**: 2025-01-XX  
**Estado**: 📋 PLAN LISTO PARA EJECUCIÓN
