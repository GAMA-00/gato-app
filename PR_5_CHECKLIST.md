# PR #5 - ListingService Layer - Checklist

## 📋 Pre-Flight Check

### ✅ PR #4 Status
- [x] AppointmentService creado y funcionando
- [x] 3 hooks migrados sin cambios de comportamiento
- [x] Build passing
- [x] Smoke tests exitosos
- [x] No console.* en hooks migrados
- [x] DO_NOT_CHANGE_BEHAVIOR respetado

### 🎯 PR #5 Scope
**Objetivo**: Crear ListingService y migrar queries de READ-ONLY  
**Riesgo**: Bajo (solo lecturas, no pagos ni RPCs)  
**Estimado**: 1-2 horas  

---

## 📦 Entregables PR #5

### 1. Service Layer ✅
- [x] Crear `src/services/listingService.ts`
- [x] Clase estática ListingService
- [x] Validación Zod en UpdateListingDTO
- [x] Logger en todas las funciones
- [x] JSDoc documentation

### 2. Funciones Implementadas ✅
- [x] `getActiveListings(providerId?)`
- [x] `getListingById(id)`
- [x] `updateListing(id, data)`
- [x] `getProviderListings(providerId)`
- [x] `getListingWithResidencias(listingId)` (bonus)
- [x] `getListingsBasic(providerId?)` (bonus - dropdowns)

### 3. Archivos a Migrar (Solo Lecturas)
- [ ] hooks que lean listings (buscar pattern `.from('listings').select`)
- [ ] páginas de servicio (detail, edit, create)
- [ ] componentes de búsqueda/filtrado
- [ ] NO TOCAR: useRecurringBooking (pagos), robustBookingSystem

---

## 🔍 Validación de Seguridad

### Funciones SECURITY DEFINER - Check
```sql
-- Query ejecutada ✅
SELECT p.proname, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true
  AND n.nspname = 'public'
  AND p.proname IN (
    'create_appointment_with_slot_extended',
    'create_appointment_with_slot',
    'advance_recurring_appointment',
    'cancel_appointment_atomic'
  );
```

### Checklist de Seguridad (verificar en output)
- [ ] `SET search_path TO 'public'` presente en todas
- [ ] Guards de auth: `auth.uid() = p_client_id` o equivalente
- [ ] Sin SQL injection vectors (queries parametrizadas)
- [ ] Validación de permisos antes de operaciones críticas

---

## 🚫 Archivos Protegidos - NO TOCAR

```
❌ src/hooks/useRecurringBooking.ts - PAGOS CRÍTICOS
❌ src/utils/robustBookingSystem.ts - SISTEMA ATÓMICO
❌ Edge functions de OnvoPay - PAGOS
❌ RPCs de appointments - OPERACIONES ATÓMICAS
❌ DO_NOT_CHANGE_BEHAVIOR blocks - LÓGICA PROTEGIDA
```

---

## ✅ Smoke Tests PR #5

### Test 1: Lectura de Listings
```
1. Login como provider
2. Ir a "Mis Servicios" (/services o /provider/listings)
3. Verificar:
   - ✅ Lista de servicios cargada correctamente
   - ✅ Datos mostrados (título, precio, estado)
   - ✅ No errores en console
   - ✅ Network: query a /rest/v1/listings
```

### Test 2: Edición de Listing
```
1. Desde "Mis Servicios", hacer clic en "Editar" de un servicio
2. Cambiar título o precio
3. Guardar
4. Verificar:
   - ✅ updateListing llamado correctamente
   - ✅ Toast de éxito mostrado
   - ✅ Dashboard refleja cambios
   - ✅ Query invalidation funcionando (PR #3)
```

### Test 3: Creación de Listing (si aplica)
```
1. "Crear Nuevo Servicio"
2. Llenar formulario
3. Guardar
4. Verificar:
   - ✅ Listing creado
   - ✅ Aparece en lista
   - ✅ Sin errores
```

### Test 4: Detalle de Servicio (Client View)
```
1. Login como cliente
2. Buscar servicio
3. Ver detalle
4. Verificar:
   - ✅ getListingById funcionando
   - ✅ Datos completos mostrados
   - ✅ Provider info cargada
```

---

## 🔧 Build & Lint

```bash
# Pre-merge checks
✅ npm run lint    # Sin errores
✅ npm run build   # Build exitoso
✅ TypeScript      # Sin errores de tipo

# Grep checks
✅ grep -r "console\." src/services/listingService.ts  # Debe estar vacío
✅ grep -r "from('listings')" src/hooks/  # Verificar migraciones
```

---

## 📊 Métricas Esperadas

| Métrica | Antes PR #5 | Después PR #5 | Meta |
|---------|-------------|---------------|------|
| Services creados | 1 | 2 | ✅ |
| Queries centralizadas | 6 | 12+ | ✅ |
| Hooks con queries inline | ~10 | ~5 | ✅ |
| Archivos >300 LOC | ? | ↓ | ✅ |
| console.* en services | 0 | 0 | ✅ |

---

## 🚦 Gate GO/NO-GO para PR #6

Antes de iniciar PR #6 (Dashboard Split), verificar:

### Requisitos Técnicos
- [ ] Service layer: AppointmentService ✅
- [ ] Service layer: ListingService ✅
- [ ] Query invalidation utils ✅
- [ ] LoadingScreen unificado ✅
- [ ] Logging unificado en services ✅

### Requisitos de Calidad
- [ ] Build/Lint pasando ✅
- [ ] No console.* en código nuevo ✅
- [ ] DO_NOT_CHANGE_BEHAVIOR intactos ✅
- [ ] Golden snapshots de endpoints sin cambios ✅
- [ ] Smoke tests completos ✅

### Requisitos de Seguridad
- [ ] SECURITY DEFINER functions validadas ✅
- [ ] SET search_path present ✅
- [ ] auth.uid() guards present ✅
- [ ] RLS policies correctas ✅

**Si todos ✅ → GO para PR #6**  
**Si alguno ❌ → NO-GO, resolver primero**

---

## 📝 Plantilla de PR #5

### Título
```
[Refactor][Services] ListingService + migración de queries de listings
```

### Descripción
```
## Cambios
- Creado `services/listingService.ts` con 6 funciones de I/O
- Migrados N archivos (hooks/pages) sin alterar comportamiento
- Validación Zod en UpdateListingDTO
- Logger consistente en todas las funciones
- Sin cambios en pagos/RPCs/DB contracts

## Funciones del Service
- `getActiveListings(providerId?)` - Listings activos
- `getListingById(id)` - Detalle completo de listing
- `updateListing(id, data)` - Actualizar listing
- `getProviderListings(providerId)` - Listings de un provider
- `getListingWithResidencias(listingId)` - Con cobertura geográfica
- `getListingsBasic(providerId?)` - Lightweight para dropdowns

## Cómo probar
1. Login → Provider Dashboard
2. CRUD básico de listings (crear/editar/listar)
3. Confirmar que el dashboard refleja cambios sin errores
4. Network: verificar queries a /rest/v1/listings

## Rollback
- Revert del commit (no hay migraciones ni contratos nuevos)

## Riesgo
- **Bajo**: Solo I/O de listings, no toca pagos ni RPCs
```

### Labels
```
- refactor
- service-layer
- low-risk
- no-behavior-change
```

---

## 📈 Progreso de Refactor

### ✅ Completado
1. **PR #1**: Unified Logging (15 archivos)
2. **PR #2**: LoadingScreen Component (8 archivos)
3. **PR #3**: Query Invalidation Utils (5 archivos)
4. **PR #4**: AppointmentService Layer (3 hooks)
5. **PR #5**: ListingService Layer (en progreso)

### 🔜 Siguiente
- **PR #6**: useDashboardAppointments Split
  - Separar orquestación de lógica de filtrado
  - Hooks específicos: useTodayAppointments, useTomorrowAppointments
  - useAutoCompleteAppointments para el auto-update
  - Target: <200 LOC por archivo

---

## 🎯 Success Criteria PR #5

### Funcionalidad
- [ ] Todos los listings se cargan correctamente
- [ ] Edición de listings funciona
- [ ] Creación de listings funciona (si aplica)
- [ ] Cliente puede ver detalles de servicios
- [ ] Query invalidation funciona (gracias a PR #3)

### Código
- [ ] ListingService.ts creado con 6+ funciones
- [ ] Validación Zod presente
- [ ] Logger en todas las funciones
- [ ] Sin console.* en service
- [ ] JSDoc completo

### Performance
- [ ] Mismo número de queries que antes
- [ ] Sin invalidaciones excesivas
- [ ] staleTime respetado en hooks

### Seguridad
- [ ] No hay regresiones en RLS
- [ ] SECURITY DEFINER functions intactas
- [ ] No se exponen datos sensibles

---

**Si todo ✅ → MERGE PR #5 y continuar a PR #6**

**Fecha**: 2025-01-XX  
**Autor**: Lovable AI  
**Estado**: 🚧 EN PROGRESO
