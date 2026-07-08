# CLAUDE.md — contexto para programar Gato

Guía para agentes (y devs) que vayan a trabajar este repo. Leé también el
[README.md](README.md) (setup) y **[docs/CONCEPTO_V1.md](docs/CONCEPTO_V1.md)** (fuente de
verdad del producto).

## Qué es
**Gato**: PWA mobile-first (React+Vite+Supabase) — SaaS para proveedores de servicio a
domicilio en Costa Rica. Pilares v1: (1) agenda ordenada, (2) recordatorios WhatsApp,
(3) rutas eficientes por cantón, (4) datos del negocio. El cliente reserva por un
**booking link público** `gato.app/{slug}`.

## Estado actual (lo que YA está hecho)
- ✅ **Esquema limpio v1** reconstruido (ver "Base de datos" abajo).
- ✅ **Booking link** público (`src/pages/PublicBooking.tsx`, ruta `/:slug`) — perfil + flujo de reserva completo.
- ✅ **Agenda del proveedor** (`src/pages/Calendar.tsx` → `WeeklyAgendaGrid` + `PendingRequestsCard`), con aceptar/rechazar.
- ✅ **Onboarding del proveedor** (`src/pages/OnboardingProvider.tsx`, `/onboarding`).
- ✅ **Proximidad** (recomendar slots por cantón + descuento) y **recordatorios** (encolado por trigger; envío por desplegar).
- ✅ **Limpieza de código muerto** (pagos/facturas/equipo/residencias) + rutas muertas removidas.
- ✅ **Simulador local** (Supabase local + datos demo) y **tests** (`npm test`, 18 checks).
- ✅ **PWA** instalable (vite-plugin-pwa).

## Lo que falta (próximos pasos)
- Login **OTP por WhatsApp** (hoy el alta del proveedor es email/contraseña; OTP requiere WhatsApp desplegado).
- **Enviar** recordatorios de verdad (edge `send-reminders` + WhatsApp Cloud API + plantillas Meta).
- **Dashboard de datos** (pilar #4): stats reales en Inicio (clientes nuevos, ganancias, recurrentes, tiempo en traslados).
- Pantallas de config (SE-4 recordatorios, M-1 mapa/descuento, A-3 buffer), detalle de cita (H-2), detalle de solicitud (S-2), directorio (D-1/D-2), reseñas.
- Borrar componentes/hooks muertos del calendario y agregar tests unitarios (vitest).
- (Centroides de los 84 cantones ya cargados — precisión aproximada; mejorar con geometría oficial IGN si se requiere.)

## Decisiones tomadas (respetar)
- **Pagos OnvoPay**: presentes en el código pero **ocultos en v1**. No exponerlos ni dispararlos.
- **Ubicación = cantón** (no residencias). `users.canton_base_id`, `provider_cantones`, `appointments.canton_id`.
- **Auth proveedor v1 = email/contraseña** (OTP WhatsApp diferido).
- **Branch de trabajo = `develop`** (PRs a develop). `main` tiene lo viejo de Lovable.

## Convenciones / reglas
- **Timezone SIEMPRE `America/Costa_Rica`** (`DATE_CONFIG.DEFAULT_TIMEZONE`). Bug histórico: usaba `America/Mexico_City`. Para agrupar por día usar `formatInTimeZone`.
- **NO consultar tablas muertas** (dan 404 en el esquema limpio): `onvopay_*`, `payment_methods`, `invoices`, `post_payment_*`, `price_history`, `residencias`, `condominiums`, `provider_residencias`, `listing_residencias`, `team_members`, `cancellation_policies`, `email_logs`, `provider_slot_preferences`, `admin_stat_offsets`, `system_settings`.
- **Datos:** TanStack Query. Al mutar citas, invalidar **`['agenda-week']`**, `['pending-requests']`, `['appointments']`, `['calendar-appointments']` (la grilla nueva usa `agenda-week`).
- **UI:** shadcn/ui + tokens semánticos de Tailwind (no colores hardcode). Mobile-first, botones ≥48px, español costarricense.
- **Migraciones nuevas:** aditivas e idempotentes (`IF NOT EXISTS`, `ON CONFLICT`, `DROP POLICY IF EXISTS` antes de `CREATE POLICY`). Postgres no soporta `CREATE POLICY IF NOT EXISTS`.
- **Cliente Supabase nuevo:** las tablas/RPC nuevas pueden no estar en los tipos autogenerados → castear `const db = supabase as any`.
- Verificar siempre con `npx tsc --noEmit -p tsconfig.app.json` antes de dar por hecho un cambio.

## Base de datos (rebuild limpio)
- Activa: `supabase/migrations/…_clean_v1_baseline.sql` (única migración).
- Archivadas: `supabase/migrations_legacy/` (no se aplican).
- Fuente editable del esquema: `supabase/rebuild/0{1..6}_*.sql` → para regenerar `APPLY_clean_v1.sql`
  (concatenar extensions + 01..05 + las migraciones v1 `20260616*` de legacy + 06_grants).
- Para un proyecto Supabase **nuevo**: aplicar `supabase/rebuild/APPLY_clean_v1.sql`.
- RLS: lectura pública donde el booking link la necesita; escritura del dueño. Los RPC
  son `SECURITY DEFINER`. **Hace falta GRANT** además de RLS (ver `06_grants.sql`).

## Archivos clave
| Tema | Archivo |
|------|---------|
| Booking link | `src/pages/PublicBooking.tsx` |
| Agenda grilla | `src/components/calendar/WeeklyAgendaGrid.tsx` + `src/hooks/useProviderAgendaWeek.ts` |
| Solicitudes | `src/components/calendar/PendingRequestsCard.tsx` |
| Onboarding | `src/pages/OnboardingProvider.tsx` |
| Geografía | `src/hooks/useGeografia.ts`, `src/components/geo/CantonSelector.tsx` |
| Proximidad | `src/hooks/usePublicProximity.ts` |
| Supabase client | `src/integrations/supabase/client.ts` (env con fallback a prod) |
| Tests | `tests/integration.mjs`, `test.sh` (`npm test`) |

## Gotchas
- Docker se debe mantener abierto; si no, la app no alcanza la base local ("proveedor no encontrado").
- `set_appointment_names` no debe pisar el nombre del cliente invitado (`client_id` NULL) — ya corregido.
- Clientes del booking link son **invitados** (`client_id = NULL`, datos en `client_name`/`client_phone`).
- `.env` quedó trackeado desde el clone original; revisar/rotar secretos.

## Skills (playbooks en `docs/skills/`)
`SKILL_NEW_FEATURE`, `SKILL_DATABASE_MIGRATION`, `SKILL_NEW_EDGE_FUNCTION`,
`SKILL_WHATSAPP_MESSAGING`, `SKILL_CANTONES_GEO`, `SKILL_PROXIMITY_SLOTS`, `SKILL_MODIFY_UI`.
