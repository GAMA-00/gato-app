# 🐱 Gato — SaaS para proveedores de servicio a domicilio (Costa Rica)

> **Tu negocio, más ordenado.** App para proveedores independientes (limpieza, fisio,
> lavado de carros, belleza, jardinería) que ordena su **agenda**, automatiza
> **recordatorios** por WhatsApp, optimiza **rutas por cantón** y les da **datos** de su
> negocio. El cliente reserva solo desde un **booking link público** (`gato.app/{slug}`).

Es una **PWA mobile-first** (React + Vite + Supabase). No es app nativa (v1 = PWA).

---

## 📌 Empezá por acá

1. Este README → setup y cómo correrlo.
2. **[docs/CONCEPTO_V1.md](docs/CONCEPTO_V1.md)** → el esquema maestro del producto (qué se construye y por qué).
3. **[docs/SPEC_PRODUCTO_V1.md](docs/SPEC_PRODUCTO_V1.md)** → spec de producto (34 pantallas).
4. **[CLAUDE.md](CLAUDE.md)** → contexto y convenciones para programar (lo lee Claude Code automáticamente).
5. **[docs/INDEX.md](docs/INDEX.md)** → índice de docs + skills (playbooks).

---

## 🧱 Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind + shadcn/ui |
| Estado/datos | TanStack Query (react-query) |
| Backend | Supabase (Postgres + Auth + Edge Functions + Storage) |
| Mensajería | WhatsApp Cloud API (por integrar/desplegar) |
| PWA | vite-plugin-pwa |
| Pagos | OnvoPay — **presente pero oculto en v1** (sin pagos) |

---

## 🚀 Setup local (simulador)

Levanta una copia **100% local** con esquema limpio + datos demo, sin tocar producción.

### Requisitos
- **Node 18+** y npm
- **Docker Desktop** (para Supabase local) — dejalo abierto mientras trabajás
- **Supabase CLI** — si no lo tenés:
  ```bash
  mkdir -p "$HOME/.local/share/supabase"
  curl -sL https://github.com/supabase/cli/releases/latest/download/supabase_darwin_arm64.tar.gz \
    | tar -xzf - -C "$HOME/.local/share/supabase"
  # usalo como: ~/.local/share/supabase/supabase <cmd>
  ```

### Pasos
```bash
# 1) dependencias (hay conflictos de peer deps de Lovable → usar legacy-peer-deps)
npm install --legacy-peer-deps

# 2) base local (aplica supabase/migrations/ = esquema limpio v1)
open -a Docker            # esperá ~1 min a que arranque el daemon
~/.local/share/supabase/supabase start

# 3) cargar datos demo (proveedora "María Demo" + servicios + slots + cantones)
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/rebuild/seed_demo.sql

# 4) apuntar el frontend a la base local (tomá la anon key con `supabase status`)
cat > .env.local <<'EOF'
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<ANON_KEY de `supabase status`>
EOF

# 5) correr
npm run dev          # http://localhost:8080
```

> `.env.local` está gitignored. Si no existe, el cliente apunta a producción
> (`src/integrations/supabase/client.ts` lee `VITE_SUPABASE_*` con fallback a prod).

### URLs útiles
- App: http://localhost:8080
- Booking link demo: http://localhost:8080/demo
- Supabase Studio (ver/editar la base): http://127.0.0.1:54323

### Cuentas demo (contraseña `gato1234`)
- Proveedor: `demo@gato.app`
- Cliente: `cliente@gato.app`

---

## 🧪 Tests

```bash
npm test            # verifica Docker, levanta Supabase si hace falta, corre la suite
```

Suite de integración (`tests/integration.mjs`) contra la base local: geografía, booking
link, crear/aceptar/cancelar/completar citas, doble-reserva, recordatorios, proximidad,
bloqueo de slots, RLS. Ver **[TESTING.md](TESTING.md)**.

---

## 🗄️ Base de datos — IMPORTANTE (rebuild limpio)

El proyecto se **reconstruyó** con un esquema limpio v1. Por eso:

- **`supabase/migrations/`** → contiene **una sola migración**: `…_clean_v1_baseline.sql`
  (esquema limpio completo: tablas vitales + geografía CR + features v1 + RLS + grants).
- **`supabase/migrations_legacy/`** → las ~269 migraciones viejas de Lovable (archivadas;
  **no se aplican** — no se podían replayar desde cero por nombres legacy + SQL inválido).
- **`supabase/rebuild/`** → las piezas del esquema limpio por separado + el seed demo:
  - `01_tables.sql` `02_functions.sql` `03_views.sql` `04_triggers.sql` `05_rls.sql` `06_grants.sql`
  - `APPLY_clean_v1.sql` → todo junto, **para aplicar en un proyecto Supabase nuevo** (pegar en SQL Editor).
  - `seed_demo.sql` → datos de demo.
  - `README.md` → detalle del rebuild y qué tablas se quitaron.

**Tablas "muertas" removidas en v1** (no usar): `onvopay_*`, `payment_methods`, `invoices`,
`post_payment_*`, `price_history`, `residencias`, `condominiums`, `provider_residencias`,
`listing_residencias`, `team_members`, `cancellation_policies`, `email_logs`,
`provider_slot_preferences`, `admin_stat_offsets`, `system_settings`.

**Modelo de ubicación:** se usa **cantón** (`provincias`/`cantones` + `users.canton_base_id`
+ `provider_cantones`), no residencias.

---

## 🗺️ Cómo funcionan las piezas clave

### Booking link público — `src/pages/PublicBooking.tsx` (`/:slug`)
Cada proveedor tiene un **`slug` único** (generado de su nombre por el trigger
`set_provider_slug`). El cliente entra sin login: perfil (BL-1) → ubicación/cantón (BL-2)
→ servicio (BL-3) → fecha/hora con calendario y slots recomendados (BL-4) → datos (BL-5)
→ confirmación (BL-6). Crea la cita vía RPC `create_external_booking` (cliente invitado,
`client_id = NULL`, datos en `client_name`/`client_phone`).

### Agenda del proveedor — `src/pages/Calendar.tsx`
- **`WeeklyAgendaGrid`** (`src/components/calendar/`): grilla semanal filas=horas ×
  columnas=días; chips verde "Libre" / gris "Bloq" / azul = cita. Tap bloquea/desbloquea.
  Datos vía **`useProviderAgendaWeek`** (TZ Costa Rica, react-query, key `['agenda-week']`).
- **`PendingRequestsCard`**: solicitudes pendientes con aceptar/rechazar (invalida
  `['agenda-week']` para refrescar la grilla al instante).

### Onboarding del proveedor — `src/pages/OnboardingProvider.tsx` (`/onboarding`)
Wizard O-2..O-7: tipo de servicio, cantón base, catálogo, disponibilidad, zonas, link.
Un proveedor sin catálogo es redirigido acá desde el Dashboard. (Auth: email/contraseña;
el OTP por WhatsApp queda para cuando se despliegue WhatsApp.)

### Proximidad — `src/hooks/usePublicProximity.ts` + RPC `get_recommended_slot_starts`
Si el cliente elige un cantón donde el proveedor ya tiene cita ese día, se recomiendan
los slots contiguos (⭐) y se aplica descuento si está activo (`provider_settings`).

### Geografía — `src/hooks/useGeografia.ts` + `src/components/geo/CantonSelector.tsx`
7 provincias + 84 cantones con **centroides cargados** (`cantones.centroid_lat/lng`,
precisión aproximada) para cálculo de distancias.

---

## 📁 Estructura
```
src/
  pages/            PublicBooking, Calendar, OnboardingProvider, Dashboard, Services, Profile, ...
  components/
    calendar/       WeeklyAgendaGrid, PendingRequestsCard, AvailabilityManager, ...
    geo/            CantonSelector
    layout/         MobileBottomNav, MobileNav, LogoutButton, ...
  hooks/            useGeografia, useProviderAgendaWeek, usePublicProvider/Slots/Proximity, ...
  integrations/supabase/client.ts   (lee VITE_SUPABASE_* con fallback a prod)
supabase/
  migrations/        clean baseline (1 archivo)
  migrations_legacy/ historial viejo archivado
  rebuild/           piezas del esquema + APPLY_clean_v1.sql + seed_demo.sql
  functions/         edge functions (whatsapp-send, send-reminders, onvopay-*, ...)
docs/                CONCEPTO_V1, SPEC_PRODUCTO_V1, mapas, skills
tests/integration.mjs   suite de integración
```

---

## 📦 Build / PWA
```bash
npm run build        # genera dist/ + service worker + manifest (PWA instalable)
npm run preview      # sirve el build localmente
```

## ☁️ Deploy a beta (pendiente)
1. Crear proyecto Supabase nuevo → aplicar `supabase/rebuild/APPLY_clean_v1.sql` en SQL Editor.
2. `npm run build` → publicar en Vercel/Netlify/Lovable.
3. Configurar `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` del proyecto nuevo.
4. WhatsApp: desplegar edge functions + secrets + plantillas Meta (aprobación tarda días).

---

## ⚠️ Gotchas
- **Docker se debe mantener abierto.** Si la app dice "proveedor no encontrado" o hay
  errores de conexión, levantá Docker + `supabase start`.
- **Timezone = `America/Costa_Rica`** siempre (había un bug histórico con `America/Mexico_City`).
- **No consultar tablas muertas** (lista arriba) — rompen con 404 en el esquema limpio.
- **`.env`** quedó trackeado desde el clone original; revisá/rotá si tiene secretos.
- **OnvoPay/pagos**: presente en el código pero **no se expone en v1**.

---

## 🌿 Git
- Branch de trabajo: **`develop`** (PRs apuntan a develop).
- `main` aún tiene el esquema/código viejo de Lovable — el rebuild vive en `develop`.
