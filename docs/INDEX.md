# 📋 Índice de Documentación DOE - Gato App

> **Última actualización:** Febrero 2026  
> **Versión:** 2.0 DOE

## 🎯 ¿Qué es DOE?

**Document-Oriented Engineering** es una metodología que mantiene documentación estructurada para que tanto humanos como agentes de IA puedan trabajar eficientemente sobre el código existente sin romper patrones establecidos.

---

> 🐱 **Pivote v1.** SaaS para proveedores independientes de Costa Rica
> (cantones + WhatsApp + booking link + datos).
>
> **Handoff dev:** [../README.md](../README.md) (setup) · [../CLAUDE.md](../CLAUDE.md)
> (contexto/convenciones para IA) · [../TESTING.md](../TESTING.md) (tests).
> **Fuente de verdad del producto:** [CONCEPTO_V1.md](./CONCEPTO_V1.md).

## 🗺️ Mapas del Proyecto

| Documento | Descripción |
|-----------|-------------|
| [CONCEPTO_V1.md](./CONCEPTO_V1.md) | ⭐ **Esquema maestro del nuevo concepto v1** (leer primero) |
| [SPEC_PRODUCTO_V1.md](./SPEC_PRODUCTO_V1.md) | Spec de producto canónico (34 pantallas) |
| [PROJECT_MAP.md](./PROJECT_MAP.md) | Vista de alto nivel del proyecto completo |
| [FRONTEND_MAP.md](./FRONTEND_MAP.md) | Arquitectura y estructura del frontend |
| [BACKEND_MAP.md](./BACKEND_MAP.md) | Edge Functions, DB y servicios externos |
| [GLOSSARY.md](./GLOSSARY.md) | Glosario de términos del proyecto |

---

## 🛠️ Skills (Guías Accionables)

| Skill | Cuándo Usar |
|-------|-------------|
| [SKILL_NEW_FEATURE.md](./skills/SKILL_NEW_FEATURE.md) | Agregar funcionalidad nueva al frontend |
| [SKILL_NEW_EDGE_FUNCTION.md](./skills/SKILL_NEW_EDGE_FUNCTION.md) | Crear nueva Edge Function en Supabase |
| [SKILL_DATABASE_MIGRATION.md](./skills/SKILL_DATABASE_MIGRATION.md) | Modificar esquema de base de datos |
| [SKILL_WHATSAPP_MESSAGING.md](./skills/SKILL_WHATSAPP_MESSAGING.md) | 🆕 Enviar OTP / notificaciones / recordatorios por WhatsApp |
| [SKILL_CANTONES_GEO.md](./skills/SKILL_CANTONES_GEO.md) | 🆕 Trabajar con provincias/cantones de CR y distancias |
| [SKILL_PROXIMITY_SLOTS.md](./skills/SKILL_PROXIMITY_SLOTS.md) | 🆕 Recomendar slots por proximidad y descuentos |
| [SKILL_DEBUG_PAYMENTS.md](./skills/SKILL_DEBUG_PAYMENTS.md) | Diagnosticar problemas de pago (OnvoPay — oculto en v1) |
| [SKILL_RECURRING_APPOINTMENTS.md](./skills/SKILL_RECURRING_APPOINTMENTS.md) | Trabajar con citas recurrentes |
| [SKILL_MODIFY_UI.md](./skills/SKILL_MODIFY_UI.md) | Modificar componentes de UI |

---

## 📁 Estructura de Documentación

---

## 🚀 Quick Start para IA

### Antes de cualquier tarea:

1. **Leer PROJECT_MAP.md** - Entender arquitectura general
2. **Identificar área** - ¿Frontend? ¿Backend? ¿UI?
3. **Seguir skill correspondiente** - Usar como checklist

### Para implementar feature nueva:

```
1. Leer PROJECT_MAP.md (contexto general)
2. Leer FRONTEND_MAP.md o BACKEND_MAP.md (área específica)
3. Si involucra DB: SKILL_DATABASE_MIGRATION.md
4. Si involucra UI: SKILL_DESIGN_SYSTEM.md primero
5. Seguir SKILL_NEW_FEATURE.md
```

### Para modificar UI:

```
1. Leer SKILL_DESIGN_SYSTEM.md (tokens, colores)
2. Leer SKILL_UI_PATTERNS.md (patrones existentes)
3. Leer SKILL_COMPONENT_STYLING.md (cómo estilizar)
4. Seguir SKILL_MODIFY_UI.md
5. NUNCA cambiar lógica de negocio
```

### Para debug:

```
1. Identificar área (payments, appointments, slots)
2. Leer skill de debug relevante
3. Usar queries SQL proporcionadas
4. Verificar logs de Edge Functions
```

### Para crear Edge Function:

```
1. Leer BACKEND_MAP.md (estructura, patrones)
2. Seguir SKILL_NEW_EDGE_FUNCTION.md
3. Documentar en README de la función
4. Agregar a BACKEND_MAP.md
```

---

## ⚠️ Reglas Críticas

### Archivos Protegidos

NO modificar sin revisión explícita:

```
src/hooks/useRecurringBooking.ts
src/utils/robustBookingSystem.ts
src/hooks/useDashboardAppointments.ts
src/contexts/AuthContext.tsx
supabase/functions/onvopay-*
```

### Reglas de Diseño

1. **SIEMPRE** usar tokens semánticos (nunca colores directos)
2. **SIEMPRE** mobile-first
3. **NUNCA** cambiar lógica de negocio en cambios de UI
4. **NUNCA** hardcodear valores mágicos de spacing

### Reglas de Backend

1. **SIEMPRE** incluir CORS headers en Edge Functions
2. **SIEMPRE** manejar errores con try/catch
3. **SIEMPRE** habilitar RLS en tablas nuevas
4. **NUNCA** exponer service_role_key en frontend

---

## 📊 Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Páginas | 35+ |
| Componentes (dirs) | 20+ |
| Hooks | 55+ |
| Edge Functions | 25+ |
| Tablas DB | 25+ |

---

## 🔗 Enlaces Útiles

| Recurso | URL |
|---------|-----|
| Preview | https://id-preview--d441b09c-5b37-4117-9726-bc80bbe1b056.lovable.app |
| Production | https://gato-app.lovable.app |
| Supabase Dashboard | https://supabase.com/dashboard/project/jckynopecuexfamepmoh |
| Edge Function Logs | https://supabase.com/dashboard/project/jckynopecuexfamepmoh/functions |

---

## 📝 Changelog

| Fecha | Versión | Cambios |
|-------|---------|---------|
| Feb 2026 | 2.0 | Actualización completa DOE, nuevos skills de diseño |
| - | 1.0 | Versión inicial |
