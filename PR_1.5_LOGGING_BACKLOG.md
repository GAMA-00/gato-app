# PR #1.5 - Unified Logging (Backlog)

## 📋 Resumen
Este documento lista los ~100 archivos restantes que contienen `console.*` statements y deben ser migrados a `logger` en PR #1.5.

## ✅ PR #1 - Archivos Migrados (15 archivos críticos)

### Contexts & Auth (8 archivos)
- ✅ src/contexts/AuthContext.tsx
- ✅ src/contexts/AvailabilityContext.tsx
- ✅ src/contexts/UnifiedAvailabilityContext.tsx
- ✅ src/contexts/auth/useAuthActions.ts
- ✅ src/contexts/auth/useAuthState.ts
- ✅ src/contexts/auth/utils.ts
- ✅ src/pages/Register.tsx (ya migrado previamente)
- ✅ src/pages/ProviderRegister.tsx (ya migrado previamente)

### Dashboard Components (3 archivos)
- ✅ src/components/dashboard/AppointmentCard.tsx
- ✅ src/components/dashboard/AppointmentList.tsx
- ✅ src/components/dashboard/DashboardErrorState.tsx

### Client Components (2 archivos)
- ✅ src/components/client/service/ProviderCertifications.tsx
- ✅ src/components/client/service/ProviderInfoCard.tsx

### Provider Components (2 archivos)
- ✅ src/components/provider/PostPaymentInvoicing.tsx
- ✅ src/components/provider/PostPaymentPricing.tsx

## 🔄 Pendientes para PR #1.5 (~100 archivos)

### Hooks (45 archivos estimados)
- ⏳ src/hooks/useAvailabilitySync.ts (584 ocurrencias)
- ⏳ src/hooks/useCalendarAppointments.ts
- ⏳ src/hooks/useCalendarRecurringSystem.ts
- ⏳ src/hooks/useCategories.ts
- ⏳ src/hooks/useCommissionRate.ts
- ⏳ src/hooks/useCondominiums.ts
- ⏳ Y ~39 hooks adicionales...

### Utils (31 archivos estimados)
- ⏳ src/utils/appointmentUtils.ts (353 ocurrencias)
- ⏳ src/utils/appointmentValidation.ts
- ⏳ src/utils/authUtils.ts
- ⏳ src/utils/availabilitySlotGenerator.ts
- ⏳ src/utils/bookingValidation.ts
- ⏳ src/utils/enhancedBookingValidation.ts
- ⏳ Y ~25 utils adicionales...

### Lib (3 archivos)
- ⏳ src/lib/recurrence/generator.ts (40 ocurrencias)
- ⏳ src/lib/recurrence/index.ts
- ⏳ src/lib/recurrence/utils.ts

### Components - Calendar (~10 archivos)
- ⏳ src/components/calendar/* (previamente limpios según búsqueda)

### Components - Client (~15 archivos restantes)
- ⏳ src/components/client/booking/*
- ⏳ src/components/client/results/*
- ⏳ Y otros componentes client...

### Pages (~10 archivos)
- ⏳ src/pages/* (varios ya migrados)

## 🚫 Archivos EXCLUIDOS (NO tocar)

Estos archivos tienen `DO_NOT_CHANGE_BEHAVIOR` o lógica crítica:
- ❌ src/utils/robustBookingSystem.ts
- ❌ src/hooks/useRecurringBooking.ts
- ❌ Edge functions de pagos
- ❌ Lógica atomic de bookings

## 📊 Estadísticas

- **Total archivos en proyecto**: ~500
- **Archivos con console.***: ~115
- **Migrados en PR #1**: 15 (13%)
- **Pendientes para PR #1.5**: ~100 (87%)
- **Excluidos permanentemente**: ~5

## 🎯 Estrategia PR #1.5

### Batch 1: Hooks críticos (15-20 archivos)
- useAvailabilitySync.ts
- useCalendarAppointments.ts
- useCalendarRecurringSystem.ts
- Y otros hooks de negocio críticos

### Batch 2: Utils críticos (10-15 archivos)
- appointmentUtils.ts
- appointmentValidation.ts
- bookingValidation.ts
- Y otros utils de validación

### Batch 3: Lib & recurrence (5 archivos)
- lib/recurrence/*

### Batch 4: Componentes restantes (40-50 archivos)
- Components client, provider, admin restantes
- Pages restantes

### Batch 5: Limpieza final (20-30 archivos)
- Archivos de baja criticidad
- Componentes UI genéricos

## ✅ Checklist PR #1.5

- [ ] Migrar Batch 1 (hooks críticos)
- [ ] Migrar Batch 2 (utils críticos)
- [ ] Migrar Batch 3 (lib/recurrence)
- [ ] Migrar Batch 4 (components)
- [ ] Migrar Batch 5 (cleanup)
- [ ] Ejecutar `npm run lint`
- [ ] Ejecutar `npm run build`
- [ ] Smoke tests completos
- [ ] Validar 0 ocurrencias de console.* (excepto logger.ts)

## 🔗 Referencias

- **PR #1**: Logging unificado en archivos críticos (auth, contexts, dashboard)
- **PR #1.5**: Completar migración en archivos restantes
- **PR #2**: LoadingScreen refactor
- **PR #3**: Query Invalidation Utils

---
**Última actualización**: 2025-01-XX
**Estado**: Listo para iniciar PR #1.5 después de merge de PR #1
