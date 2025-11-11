# 🧪 SMOKE TESTS CHECKLIST - Pre-PR #6

## Ejecución Manual Requerida

**Fecha:** 2025-11-11  
**Scope:** End-to-end flows críticos  
**Status:** ⏳ PENDIENTE EJECUCIÓN POR USUARIO

---

## 🎯 Objetivos

Verificar que PR #5 (ListingService) y PR #1.5 (Logging) no introdujeron regresiones funcionales.

**Criterios de aceptación:**
- ✅ Pantallas cargan correctamente
- ✅ Datos idénticos a versión anterior
- ✅ Sin errores HTTP 500
- ✅ Sin warnings nuevos en console (solo logs de logger OK)
- ✅ Misma funcionalidad pre/post cambios

---

## 👤 Smoke Test 1: Cliente Flow

### Setup
1. Login como cliente
2. Verificar dashboard carga

### Test Steps

#### 1.1. Listar Proveedores
- [ ] Ir a `/client/providers-list?serviceType=Limpieza` (o cualquier tipo de servicio)
- [ ] **Verificar:**
  - [ ] Lista de proveedores carga
  - [ ] Cards muestran nombre, avatar, rating
  - [ ] Precios visibles
- [ ] **Network tab:** GET request a `/listings` → Status 200
- [ ] **Console:** Sin errores (solo `logger.debug` OK)

**Screenshot:** `artifacts/smoke_tests/client_providers_list.png`

#### 1.2. Ver Detalle de Servicio
- [ ] Click en un proveedor desde la lista
- [ ] **Verificar:**
  - [ ] Redirige a `/client/service/:serviceId`
  - [ ] Título del servicio visible
  - [ ] Descripción carga
  - [ ] Precio y duración mostrados
  - [ ] Botón "Reservar Cita" visible
- [ ] **Network tab:** GET request a `/listings/:id` → Status 200
- [ ] **Console:** Sin errores

**Screenshot:** `artifacts/smoke_tests/client_service_detail.png`

#### 1.3. Crear Cita (Dummy - NO PAGAR)
- [ ] Click "Reservar Cita"
- [ ] **Verificar:**
  - [ ] Redirige a `/client/booking/:serviceId`
  - [ ] Calendario de disponibilidad carga
  - [ ] Slots disponibles visibles
- [ ] Seleccionar fecha/hora (NO completar pago)
- [ ] **Network tab:** GET request a `/slots` → Status 200
- [ ] **Console:** Sin errores

**Screenshot:** `artifacts/smoke_tests/client_booking_calendar.png`

---

## 👷 Smoke Test 2: Proveedor Flow

### Setup
1. Login como proveedor
2. Verificar dashboard carga

### Test Steps

#### 2.1. Ver Calendario
- [ ] Ir a `/dashboard` (o `/provider/calendar`)
- [ ] **Verificar:**
  - [ ] Calendario carga
  - [ ] Citas existentes visibles
  - [ ] Estados (pending/confirmed/completed) correctos
- [ ] **Network tab:** GET request a `/appointments` → Status 200
- [ ] **Console:** Sin errores (solo `logger.debug` OK)

**Screenshot:** `artifacts/smoke_tests/provider_calendar.png`

#### 2.2. Editar Listing
- [ ] Ir a `/services`
- [ ] **Verificar:**
  - [ ] Lista de anuncios carga
  - [ ] Click "Editar" en un listing
- [ ] Redirige a `/services/edit/:serviceId`
- [ ] Cambiar título (ej: "Test Edit 2025-11-11")
- [ ] Click "Guardar"
- [ ] **Verificar:**
  - [ ] Toast de éxito aparece
  - [ ] Cambio persiste en la lista
- [ ] **Network tab:** PATCH request a `/listings/:id` → Status 200
- [ ] **Console:** Sin errores

**Screenshots:**
- `artifacts/smoke_tests/provider_services_list.png`
- `artifacts/smoke_tests/provider_service_edit.png`

#### 2.3. Revertir Cambio
- [ ] Volver a editar el listing
- [ ] Restaurar título original
- [ ] Guardar

---

## 👑 Smoke Test 3: Admin Flow (Read-Only)

### Setup
1. Login como admin
2. Verificar acceso a panel admin

### Test Steps

#### 3.1. Panel Admin
- [ ] Ir a `/admin`
- [ ] **Verificar:**
  - [ ] Panel carga
  - [ ] Navegación funciona
- [ ] **Console:** Sin errores

**Screenshot:** `artifacts/smoke_tests/admin_panel.png`

#### 3.2. Lista de Usuarios
- [ ] Ir a `/admin/users` (o sección de usuarios)
- [ ] **Verificar:**
  - [ ] Lista de usuarios carga
  - [ ] Datos visibles (nombres, roles)
- [ ] **NO hacer cambios**
- [ ] **Network tab:** GET request a `/users` → Status 200
- [ ] **Console:** Sin errores

**Screenshot:** `artifacts/smoke_tests/admin_users_list.png`

#### 3.3. Lista de Appointments
- [ ] Ir a `/admin/appointments` (o sección de citas)
- [ ] **Verificar:**
  - [ ] Lista de appointments carga
  - [ ] Estados visibles
- [ ] **NO hacer cambios**
- [ ] **Network tab:** GET request a `/appointments` → Status 200
- [ ] **Console:** Sin errores

**Screenshot:** `artifacts/smoke_tests/admin_appointments_list.png`

---

## 📊 Reporte de Resultados

### Template

Copiar y llenar después de ejecutar tests:

```
## 📋 SMOKE TESTS - RESULTADOS

**Ejecutado por:** [Usuario]  
**Fecha:** 2025-11-11  
**Browser:** Chrome/Firefox/Safari  
**PR:** #5 + #1.5

### ✅ Cliente Flow
- [x] Listar proveedores: OK
- [x] Ver detalle servicio: OK
- [x] Crear cita (dummy): OK
- **Notas:** [cualquier observación]

### ✅ Proveedor Flow
- [x] Ver calendario: OK
- [x] Editar listing: OK
- **Notas:** [cualquier observación]

### ✅ Admin Flow
- [x] Panel admin: OK
- [x] Lista usuarios: OK
- [x] Lista appointments: OK
- **Notas:** [cualquier observación]

### 🐛 Issues Encontrados
- [ ] Ninguno ✅
- [ ] [Describir issue 1]
- [ ] [Describir issue 2]

### 📊 Console Logs
```
[Pegar logs relevantes aquí]
```

### 🌐 Network Requests
```
Status codes observados:
- GET /listings: 200 ✅
- GET /listings/:id: 200 ✅
- PATCH /listings/:id: 200 ✅
- GET /appointments: 200 ✅
```

### ✅ Aprobación
- [ ] Todos los tests pasaron
- [ ] Sin regresiones detectadas
- [ ] Console limpio (solo logger.debug)
- [ ] **GO para PR #6:** SÍ/NO

**Firma:** [Usuario]
```

---

## 🚦 Criterios GO/NO-GO

### ✅ GO a PR #6 si:
- [x] Todos los flows completados sin errores
- [x] Datos cargan correctamente
- [x] Console sin warnings/errors nuevos
- [x] Network requests: todos 200
- [x] No hay regresiones funcionales

### ❌ NO-GO si:
- [ ] Algún flow falla completamente
- [ ] Errors HTTP 500 aparecen
- [ ] Datos no cargan o muestran incorrectamente
- [ ] Console con errors nuevos (no relacionados con logger)
- [ ] Regresión funcional detectada

---

## 📝 Próximos Pasos

### Si GO:
1. Pegar resultados en este archivo
2. Guardar screenshots en `artifacts/smoke_tests/`
3. Aprobar inicio de PR #6

### Si NO-GO:
1. Documentar issues encontrados
2. Crear tickets para fixes
3. Re-ejecutar smoke tests después de fixes
4. Re-evaluar GO/NO-GO

---

## 📚 Referencias

- [PR #5 Migration Complete](./PR_5_MIGRATION_COMPLETE.md)
- [PR #1.5 Logging Complete](./PR_1.5_LOGGING_COMPLETE.md)
- [PR #6 Gate Checklist](./PR_6_GATE_CHECKLIST.md)

---

**Última actualización:** 2025-11-11  
**Próxima ejecución:** Inmediata (antes de PR #6)
