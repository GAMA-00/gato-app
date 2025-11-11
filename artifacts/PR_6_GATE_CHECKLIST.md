# 🚦 PR #6 GATE CHECKLIST

## Pre-Condition: Verificación Antes de Iniciar PR #6

**Estado actual:** ⏳ PENDIENTE  
**Bloqueante para:** PR #6 - Split de useDashboardAppointments

---

## 📋 Gate Requirements (TODOS deben ser ✅)

### 1. PR #5 Completado

- [x] **PR #5 mergeado:** ListingService implementado
- [ ] **Smoke tests ejecutados:** Cliente + Proveedor OK
- [ ] **Build passing:** Sin errores TypeScript
- [ ] **ESLint clean:** No warnings nuevos

### 2. Console Logging Cleanup (PR #1.5)

- [x] **useProvidersQuery:** Migrado a `logger` ✅
- [ ] **useServiceDetail:** Migrar console.* restantes
- [ ] **Otros hooks críticos:** Revisar y migrar
- [ ] **Regla no-console activa:** Verificada en eslint.config.js

**Comando de verificación:**
```bash
# Buscar console.* en rutas críticas
grep -r "console\." src/services/ src/hooks/use*.ts src/pages/*.tsx

# Debe retornar: No matches (o solo en comentarios)
```

### 3. Service Layer Validation

- [x] **ListingService:** Sin `any` en DTOs exportados ✅
- [ ] **Input validation:** Zod schemas en todos los services
- [ ] **No service_role:** Solo anon client usado
- [ ] **Logging consistente:** logger.debug/error en todas las funciones

**Files a revisar:**
- `src/services/listingService.ts`

### 4. Security Hardening

- [x] **SECURITY DEFINER audit:** Completado ✅
- [ ] **RLS policies:** Revisadas para tablas existentes
- [ ] **Input validation frontend:** Zod en formularios críticos
- [ ] **No SQL injection risks:** Queries parametrizadas

**Documentación:**
- `artifacts/security/SECDEF_2025-11-11_FIXED.txt` ✅
- `artifacts/security/SECURITY_CHECKLIST.md` ✅

### 5. Smoke Tests End-to-End

#### Cliente Flow
- [ ] Login cliente → dashboard
- [ ] Lista de proveedores → abrir detalle servicio
- [ ] Crear cita (sin pasar por pago)
- [ ] Ver cita en lista de appointments

#### Proveedor Flow  
- [ ] Login proveedor → dashboard
- [ ] Ver calendario con citas
- [ ] Actualizar estado de cita (pending → confirmed)
- [ ] Editar listing desde `/services`

#### Admin Flow
- [ ] Login admin → panel
- [ ] Ver lista de usuarios
- [ ] Ver lista de appointments (sin modificar)

**Criterio de aceptación:**
- ✅ Respuestas HTTP idénticas pre/post (status codes, shapes)
- ✅ Sin errores de red nuevos
- ✅ Sin warnings en console (solo logs de logger OK)

### 6. Golden Snapshots (Opcional pero Recomendado)

Si hay tiempo, crear snapshots de respuestas clave:

- [ ] `GET /appointments` (cliente)
- [ ] `GET /appointments` (proveedor)
- [ ] `POST /appointments` (crear cita)
- [ ] `PATCH /appointments/:id` (actualizar estado)

**Guardar en:** `artifacts/snapshots/pre_pr6/`

### 7. Metrics Tracking

**Baseline antes de PR #6:**

| Métrica | Valor Actual | Target PR #6 |
|---------|--------------|--------------|
| Services centralizados | 1 (ListingService) | 1 (sin cambios) |
| Queries inline | ~15 (post-PR #5) | ~12 (-3 en dashboard) |
| Console.* en críticos | ~50 | 0 |
| React Query invalidations | ~8 | ~6 (-2 redundantes) |
| Build time | ? | Sin degradación |

---

## 🔧 Actions Requeridas Antes de GO

### Acción 1: Completar migración console.* (PR #1.5)

**Archivos prioritarios:**
1. `src/components/client/service/useServiceDetail.ts` (396 líneas, ~60 console.*)
2. `src/hooks/useDashboardAppointments.ts` (si existe)
3. `src/pages/*.tsx` (páginas críticas)

**Plan:**
```typescript
// Patrón de migración
console.log('Message:', data);           // ❌
logger.debug('Message', { data });      // ✅

console.error('Error:', error);          // ❌
logger.error('Error occurred', error);  // ✅
```

### Acción 2: Smoke Tests Manuales

**Checklist de ejecución:**

1. **Cliente:**
   ```
   [ ] Ir a /client/providers-list?serviceType=Limpieza
   [ ] Verificar que lista de proveedores carga
   [ ] Click en un proveedor → /client/service/:id
   [ ] Verificar detalle muestra datos
   [ ] Click "Reservar Cita"
   [ ] Verificar redirección a booking (sin completar pago)
   ```

2. **Proveedor:**
   ```
   [ ] Ir a /dashboard (como proveedor)
   [ ] Verificar calendario carga
   [ ] Ir a /services
   [ ] Click "Editar" en un listing
   [ ] Cambiar título → Guardar
   [ ] Verificar que cambio persiste
   ```

3. **Admin:**
   ```
   [ ] Ir a /admin
   [ ] Verificar que panel abre
   [ ] Ver lista de usuarios
   [ ] Ver lista de appointments
   [ ] NO hacer cambios (solo lectura)
   ```

**Evidencia:**
- Screenshot de cada flow
- Console logs (deben ser solo de logger, no console.*)
- Network tab (verificar status 200, no 500s)

### Acción 3: Validar Regla ESLint

**Verificar en `eslint.config.js`:**

```javascript
rules: {
  "no-console": ["error", { "allow": [] }], // ✅ DEBE estar en error
}
```

**Excepciones permitidas:**
```javascript
{
  files: ["src/utils/logger.ts"],
  rules: {
    "no-console": "off", // ✅ Solo en logger.ts
  },
}
```

### Acción 4: Crear Documentación Restante

- [x] `SECURITY_CHECKLIST.md` ✅
- [x] `ARCHITECTURE_SERVICES.md` ✅
- [ ] `TESTING_GUIDE.md` (smoke tests procedure)
- [ ] Update `PR_6_MIGRATION_PLAN.md` con gate results

---

## 🚦 GO/NO-GO Decision

### ✅ GO Criteria (TODOS deben cumplirse)

1. ✅ PR #5 mergeado y stable
2. ✅ 0 console.* en archivos críticos (services/, hooks/use*.ts)
3. ✅ ESLint rule activa y passing
4. ✅ Smoke tests ejecutados sin regresiones
5. ✅ Security checklist revisada
6. ✅ Documentación completa

### ❌ NO-GO Criteria (CUALQUIERA bloquea)

- ❌ Smoke tests fallan (errors HTTP 500, datos no cargan)
- ❌ Build con errores TypeScript
- ❌ Console.* todavía presentes en >10 archivos críticos
- ❌ Security audit pendiente
- ❌ Regresiones funcionales detectadas

---

## 📊 Current Status

### Completados ✅
- [x] PR #5 ListingService implementado
- [x] Security audit DEFINER aprobado
- [x] SECURITY_CHECKLIST.md creado
- [x] ARCHITECTURE_SERVICES.md creado
- [x] Migración console.* en useProvidersQuery

### En Progreso 🚧
- [ ] Migración console.* en useServiceDetail (60 líneas)
- [ ] Smoke tests end-to-end (cliente/proveedor/admin)
- [ ] Validación ESLint en CI

### Pendientes ⏳
- [ ] Crear snapshots de golden responses
- [ ] Documentar TESTING_GUIDE.md
- [ ] Confirmar métricas baseline

---

## 📝 Next Steps

### Inmediato (Usuario)
1. **Ejecutar smoke tests** siguiendo checklist de Acción 2
2. **Reportar resultados** (screenshots + console logs)
3. **Confirmar GO/NO-GO** para PR #6

### Si GO → Iniciar PR #6
1. Crear branch `pr6-dashboard-split`
2. Split `useDashboardAppointments` en:
   - `useAppointmentFiltering.ts`
   - `useAppointmentAutoUpdate.ts`
   - `utils/appointmentDeduplication.ts`
3. Mantener comportamiento idéntico (DO_NOT_CHANGE_BEHAVIOR)
4. Tests antes/después: comparar listas de appointments

### Si NO-GO → Resolver Bloqueantes
1. Completar migración console.* restante
2. Ejecutar smoke tests hasta pasar
3. Revisar security issues pendientes
4. Re-evaluar gate criteria

---

## 🔗 Referencias

- [PR #5 Migration Complete](./PR_5_MIGRATION_COMPLETE.md)
- [Security Checklist](./security/SECURITY_CHECKLIST.md)
- [Architecture Services](./ARCHITECTURE_SERVICES.md)
- [PR #6 Migration Plan](./PR_6_MIGRATION_PLAN.md) (pendiente update)

---

**Fecha de creación:** 2025-11-11  
**Owner:** Gate Keeper (AI Agent)  
**Aprobadores requeridos:** 
- [ ] Usuario (smoke tests)
- [ ] Tech Lead (security review)
- [ ] Product (no regressions)

**Estado:** ⏳ ESPERANDO SMOKE TESTS Y MIGRACIÓN CONSOLE.*
