# 🐱 Gato — Esquema del Nuevo Concepto v1

> **Documento maestro del pivote.** Antes de tocar código, este archivo define QUÉ
> estamos cambiando, POR QUÉ, y CÓMO. Es la fuente de verdad del nuevo concepto.
> Cualquier feature nueva debe alinearse con este documento.
>
> Estado: **Planeación** · Versión: v1.1 · Junio 2026
>
> 📄 Spec de producto canónico (34 pantallas): [SPEC_PRODUCTO_V1.md](./SPEC_PRODUCTO_V1.md)

---

## 1. El cambio en una frase

Gato deja de ser un **marketplace genérico de servicios en residencias/condominios**
y se convierte en un **SaaS para proveedores de servicio a domicilio independientes
de Costa Rica** que ordena su agenda, automatiza recordatorios por WhatsApp, optimiza
rutas por cantón y les da datos de su negocio.

**Usuario primario:** proveedor con 10–40 clientes activos (ej: señora de limpieza,
fisioterapeuta, lavado de carros).

**Filosofía:** minimalismo funcional. Máximo 3 taps por acción crítica, texto+ícono
siempre, botones grandes (≥48px), español costarricense, confirmación antes de
acciones destructivas, estados vacíos útiles.

---

## 2. Los 4 problemas que resolvemos (alcance real del v1)

De la conversación con Vicente, el v1 se enfoca en 4 pilares — todo lo demás es
secundario:

| # | Problema | Solución en Gato |
|---|----------|------------------|
| 1 | **Desorden en la agenda** | Link de reserva público (el cliente agenda solo) + agenda con slots, buffer y solicitudes |
| 2 | **Recordatorios manuales** | Recordatorios automáticos por WhatsApp (24h antes; y recordatorio para agendar el próximo mes) |
| 3 | **Rutas ineficientes** | Mapa/agenda por cantón + recomendación de horarios contiguos en el mismo cantón + descuento opcional por proximidad |
| 4 | **Falta de datos** | Dashboard: clientes nuevos del mes, ganancias, clientes recurrentes, tiempo perdido en traslados |

> Si una feature propuesta no sirve a uno de estos 4 pilares, va a v2.

---

## 3. Decisiones tomadas (y pendientes)

| Tema | Decisión | Estado |
|------|----------|--------|
| **Pagos (OnvoPay)** | Mantener el código intacto pero **no exponerlo en el flujo v1**. El spec dice "sin pagos en v1". Reversible. | ✅ Decidido |
| **Modelo de ubicación** | **Agregar** provincias/cantones como capa nueva; **mantener** residencias/condominios. Coexisten durante la transición. | ✅ Decidido |
| **Login de proveedor (OTP WhatsApp)** | Pendiente. OTP = código de 6 dígitos por WhatsApp, sin contraseña (pantalla O-1). Recomendación: email/contraseña para clientes + OTP solo para proveedores. | ⏳ Pendiente |
| **Suscripción Gato Pro (₡9.990/mes)** | Existe OnvoPay para cobrarla; decisión de activarla en v1 o no, pendiente. | ⏳ Pendiente |

---

## 4. Análisis de brecha: qué existe vs. qué falta

### ✅ Ya existe y se reutiliza

- **Citas/appointments** con estados (`pending`, `confirmed`, `completed`,
  `cancelled`, `rejected`, `rescheduled`) → sirve para solicitudes y agenda.
- **Recurrencia** (`recurring_rules`, semanal/quincenal/mensual) → sirve para citas
  recurrentes y recordatorio de "agendá el próximo mes".
- **Catálogo de servicios** (`listings`: precio, duración, variantes) → catálogo del
  proveedor (O-4, SE-2, BL-3).
- **Calendario / slots** (`provider_availability`, `provider_time_slots`,
  `useWeeklySlots`) → agenda y disponibilidad (O-5, A-1, A-3).
- **Directorio de proveedores** (categorías, búsqueda) → Directorio Gato (D-1, D-2).
- **Auth Supabase** (email/contraseña, roles client/provider/admin) → base de auth.
- **OnvoPay** (22 edge functions) → se conserva, oculto en v1.

### 🆕 Hay que construir desde cero

| Pieza | Descripción | Pantallas del spec |
|-------|-------------|--------------------|
| **Geografía CR** | 7 provincias + 84 cantones precargados, con centroide geográfico por cantón | O-3, O-6, SE-3, todas las de cantón |
| **WhatsApp Business** | Integración con WhatsApp Cloud API para OTP, notificaciones y recordatorios | O-1, S-1, H-2, SE-4, Sección 9 |
| **Booking link público** | `gato.app/{slug}` sin login: perfil + flujo de reserva de 5 pasos | BL-1 … BL-6 |
| **Recomendación por proximidad** | Marcar slots contiguos a citas en el mismo cantón como ⭐ recomendados | A-4, BL-4, M-1 |
| **Descuento por proximidad** | Descuento % automático en slots recomendados | M-1, BL-4 |
| **Buffer de traslado** | Slot extra de 30min bloqueado automáticamente tras cada cita | O-5, A-1, A-3 |
| **Recordatorios automáticos** | Job que envía WhatsApp 24h/2h antes; y recordatorio mensual | SE-4, Sección 9 |
| **Dashboard de datos** | Métricas: clientes nuevos, ganancias, recurrentes, tiempo en traslados | H-1, SE-5 |
| **Mapa** | Vista de mapa con pins por cantón, rutas, preferencias por cantón | M-1 |

### 🔇 Se oculta en v1 (no se borra)

- Checkout / pago en el flujo de booking (OnvoPay queda en backend).
- Facturas expuestas al cliente como paso obligatorio.
- Sistema automático de reseñas post-servicio (reseñas curadas manualmente en v1).

---

## 5. Modelo de datos — cambios propuestos

> Todas las tablas nuevas con RLS habilitado. Migraciones aditivas (no destructivas)
> para no romper datos existentes. Ver `skills/SKILL_DATABASE_MIGRATION.md`.

### 5.1 Geografía de Costa Rica

```sql
-- 7 provincias
provincias (
  id          smallint PRIMARY KEY,   -- 1..7
  nombre      text NOT NULL           -- San José, Alajuela, Cartago, Heredia,
)                                      -- Guanacaste, Puntarenas, Limón

-- 84 cantones, con centroide para cálculo de distancias
cantones (
  id            integer PRIMARY KEY,
  provincia_id  smallint REFERENCES provincias(id),
  nombre        text NOT NULL,
  centroid_lat  double precision NOT NULL,   -- centro geográfico del cantón
  centroid_lng  double precision NOT NULL
)
```

> Lectura pública (RLS `SELECT true`), escritura solo `service_role`. Datos cargados
> por seed/migración. Ver `skills/SKILL_CANTONES_GEO.md`.

### 5.2 Ubicación del proveedor y zonas de trabajo

```sql
-- Cambios a users (aditivos)
users.canton_base_id   integer REFERENCES cantones(id)  -- cantón de residencia (O-3)
users.slug             text UNIQUE                       -- gato.app/{slug} (O-7)

-- Zonas de trabajo del proveedor (O-6, SE-3)
provider_cantones (
  provider_id       uuid REFERENCES users(id),
  canton_id         integer REFERENCES cantones(id),
  preferred_days    int[],          -- 0..6, días preferidos para ese cantón
  accepts_requests  boolean DEFAULT true,   -- toggle "aceptar solicitudes de este cantón"
  PRIMARY KEY (provider_id, canton_id)
)
```

> **Seguridad:** nunca se guarda la dirección exacta del proveedor. Solo el
> `canton_base_id` y se usa su `centroid_lat/lng` para distancias cuando no hay otras
> citas de referencia ese día.

### 5.3 Ubicación del cliente en la cita

```sql
-- Cambios a appointments (aditivos)
appointments.canton_id        integer REFERENCES cantones(id)  -- cantón del cliente (geocoding inverso)
appointments.client_lat       double precision    -- ubicación GPS del cliente
appointments.client_lng       double precision
appointments.address_detail   jsonb               -- { house_number, color_senas, referencias }
-- Para clientes del booking link sin cuenta:
appointments.guest_name       text
appointments.guest_whatsapp   text
```

### 5.4 Configuración del proveedor (buffer, descuentos, recordatorios)

```sql
provider_settings (
  provider_id              uuid PRIMARY KEY REFERENCES users(id),
  buffer_enabled           boolean DEFAULT true,
  buffer_minutes           integer DEFAULT 30,
  proximity_discount_enabled boolean DEFAULT false,
  proximity_discount_pct   integer DEFAULT 0,          -- 5 | 10 | 15
  show_recommended_slots   boolean DEFAULT true,
  reminder_24h_enabled     boolean DEFAULT true,
  reminder_2h_enabled      boolean DEFAULT false
)
```

### 5.5 WhatsApp

```sql
-- Códigos OTP (si se aprueba login por OTP)
whatsapp_otp (
  id          uuid PRIMARY KEY,
  phone       text NOT NULL,
  code_hash   text NOT NULL,         -- nunca guardar el código en claro
  expires_at  timestamptz NOT NULL,
  attempts    integer DEFAULT 0,
  verified_at timestamptz
)

-- Log de mensajes (auditoría + reenvío de respuestas al proveedor)
whatsapp_messages (
  id              uuid PRIMARY KEY,
  direction       text,              -- 'outbound' | 'inbound'
  to_phone        text,
  from_phone      text,
  template        text,              -- nombre de plantilla usada
  body            text,
  wa_message_id   text,              -- id devuelto por la API de Meta
  status          text,              -- queued|sent|delivered|read|failed
  appointment_id  uuid REFERENCES appointments(id),
  created_at      timestamptz DEFAULT now()
)
```

### 5.6 Recordatorios

```sql
-- Cola de recordatorios (la genera un job al confirmar la cita)
reminder_jobs (
  id              uuid PRIMARY KEY,
  appointment_id  uuid REFERENCES appointments(id),
  kind            text,              -- '24h' | '2h' | 'rebook_monthly'
  send_at         timestamptz NOT NULL,
  sent_at         timestamptz,
  status          text DEFAULT 'pending'  -- pending|sent|skipped|failed
)
```

---

## 6. Backend — edge functions nuevas

| Función | Propósito | Trigger |
|---------|-----------|---------|
| `whatsapp-send` | Enviar mensaje/plantilla vía WhatsApp Cloud API | Interna (otras funciones) |
| `whatsapp-webhook` | Recibir estados de entrega y respuestas entrantes del cliente | Webhook de Meta |
| `whatsapp-otp-request` | Generar y enviar OTP de 6 dígitos | Login proveedor (O-1) |
| `whatsapp-otp-verify` | Validar OTP y crear/iniciar sesión | Login proveedor (O-1) |
| `send-reminders` | Cron: busca `reminder_jobs` con `send_at <= now()` y los envía | Scheduled (cada 15 min) |
| `geocode-reverse` | Geocoding inverso GPS → cantón (Google) | Booking link (BL-2) |

> Secrets requeridos (en Supabase, **nunca** en código ni en `.env` commiteado):
> `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`,
> `GOOGLE_MAPS_API_KEY`. Ver `skills/SKILL_WHATSAPP_MESSAGING.md`.

---

## 7. Frontend — mapa de pantallas (34 totales)

> Leyenda: 🟢 reutiliza algo existente · 🟡 modifica fuerte · 🔴 nuevo desde cero

| # | Pantalla | Estado | Notas |
|---|----------|--------|-------|
| L-1 | Landing (Soy Proveedor / Soy Cliente) | 🟡 | Ya hay LandingPage |
| CO-1 | Login cliente (email+pass) | 🟢 | Existe ClientLogin |
| CO-2 | Registro cliente | 🟢 | Existe Register |
| O-1 | Login OTP WhatsApp (proveedor) | 🔴 | Depende de decisión OTP |
| O-2 | Registro básico proveedor | 🟡 | Adaptar ProviderRegister |
| O-3 | Cantón de residencia | 🔴 | Necesita geografía CR |
| O-4 | Catálogo de servicios | 🟢 | Reutiliza listings |
| O-5 | Disponibilidad + buffer | 🟡 | Reutiliza availability, agrega buffer |
| O-6 | Zonas/cantones de trabajo | 🔴 | provider_cantones |
| O-7 | ¡Todo listo! + link | 🔴 | Genera slug, compartir WhatsApp |
| H-1 | Inicio (solicitudes+citas+stats) | 🟡 | Reusar Dashboard, agregar bloques |
| H-2 | Detalle de cita | 🟡 | Agregar WhatsApp, quitar reagendar |
| A-1 | Agenda semanal | 🟡 | Agregar colores buffer/recomendado |
| A-2 | Crear cita manual | 🟢 | Existe parcialmente |
| A-3 | Editar disponibilidad + buffer | 🟡 | |
| A-4 | Vista por cantones | 🔴 | Recomendación por proximidad |
| A-5 | Google Calendar sync | 🔴 | OAuth Google |
| S-1 | Lista de solicitudes | 🟡 | Citas en estado pending |
| S-2 | Detalle de solicitud | 🔴 | Mapa, distancias, contraoferta |
| SE-1 | Menú Servicio | 🟡 | Reorganizar perfil |
| SE-2 | Mi catálogo | 🟢 | Existe Services |
| SE-3 | Mis cantones de trabajo | 🔴 | |
| SE-4 | Recordatorios automáticos | 🔴 | Toggles provider_settings |
| SE-5 | Mis estadísticas | 🟡 | Expandir useStats |
| SE-6 | Mi suscripción | 🟡 | OnvoPay membership |
| M-1 | Mapa + preferencias cantón | 🔴 | |
| BL-1 | Perfil proveedor (booking) | 🔴 | Público sin login |
| BL-2 | Ubicación GPS + detalles | 🔴 | GPS + geocoding inverso |
| BL-3 | Selección de servicio | 🔴 | |
| BL-4 | Fecha/hora + slots recomendados | 🔴 | |
| BL-5 | Datos del cliente | 🔴 | |
| BL-6 | Confirmación + .ics | 🔴 | |
| D-1 | Home del directorio | 🟡 | Reusar directorio, filtro por cantón |
| D-2 | Perfil desde directorio | 🟡 | Agregar reseñas |

---

## 8. Lógica clave del sistema

### 8.1 Slots y buffer
- Cada slot = 30 min. Un servicio de 2h ocupa 4 slots + 1 slot de buffer (amarillo).
- Buffer configurable por `provider_settings` (default ON, 30 min).

### 8.2 Recomendación por proximidad (pilar 3)
1. Cliente fija ubicación GPS en el booking link → `geocode-reverse` → `canton_id`.
2. Si ese día ya hay una cita activa en el **mismo cantón**:
   - Slot inmediatamente **anterior** y **posterior** a esa cita se marcan ⭐.
   - Al cliente se le muestran primero, con texto "el proveedor ya estará en tu zona".
3. Si `proximity_discount_enabled`, los slots ⭐ muestran precio con descuento.

### 8.3 Distancias
- Si hay citas ese día: distancia entre cita anterior/siguiente (centroides de cantón).
- Si no hay citas: distancia desde el `centroid` del `canton_base_id` del proveedor.
- "Tiempo en traslados" estima velocidad promedio de **30 km/h** en ciudad.

### 8.4 Notificaciones (Sección 9 del spec)
- **Canal único al cliente: WhatsApp Business de Gato.** El proveedor nunca expone su
  número personal.
- Al proveedor: push (PWA) + in-app.
- Eventos: solicitud recibida, cita confirmada, recordatorio 24h/2h, cancelación.

---

## 9. Riesgos y notas técnicas

- ✅ **Timezone:** corregido a **`America/Costa_Rica`** en el esquema limpio
  (`generate_provider_time_slots_for_listing` y la grilla nueva). Antes usaba
  `America/Mexico_City`. Usar siempre `formatInTimeZone` para agrupar por día.
- ⚠️ **WhatsApp templates:** los mensajes salientes fuera de la ventana de 24h
  requieren **plantillas aprobadas** por Meta. Hay que registrarlas antes de producción.
- ⚠️ **Token de WhatsApp filtrado:** el token compartido en chat debe **regenerarse**
  y vivir solo como secret en Supabase.

### ✅ Tareas pendientes (tracking)

- [ ] **Regenerar el token de WhatsApp** en Meta for Developers (el actual se filtró en
  chat) y guardarlo solo como secret `WHATSAPP_TOKEN` en Supabase. _Anotado 2026-06-16._
- [ ] Definir decisión de login OTP (ver §3).
- [x] ~~Cargar centroides de los 84 cantones~~ ✅ Hecho (migración `..._centroides.sql`,
  promedio de distritos del dataset LatLongCR + Monteverde/Puerto Jiménez a cabecera).
  _Precisión aproximada, suficiente para v1; reemplazar por geometría oficial IGN si se requiere mayor exactitud._
- ⚠️ **Clientes invitados (booking link):** reservan sin cuenta. Definir si se crea un
  usuario "guest" o se guarda en `appointments.guest_*`. Recomendación: guest fields
  + opción de reclamar la cuenta luego.
- ⚠️ **OnvoPay oculto:** verificar que ningún flujo nuevo dispare edge functions de
  pago hasta reactivarlas.

---

## 10. Plan por fases (propuesto)

> Cada fase = un PR (o set de PRs) revisable. Branch desde `develop`, PR a `develop`.

| Fase | Entrega | Pilar |
|------|---------|-------|
| **F0** | ✅ Esquema (este doc) + skills + mapas actualizados | — |
| **F1** | ✅ Geografía CR (tablas + seed 84 cantones + centroides + hooks + selector + distancias) | Base |
| **F2** | 🔨 WhatsApp Cloud API (`whatsapp-send`, `whatsapp-webhook`, log, service) — _backend listo; falta registrar plantillas en Meta y cablear a eventos_ | 2 |
| **F3** | 🔨 Booking link público `gato.app/{slug}` (BL-1…BL-6, sin pago) — _flujo completo funcional; pendientes: geocoding inverso automático, .ics, multi-servicio_ | 1 |
| **F4** | 🔨 Solicitudes + buffer + datos H-1 — _loop aceptar/rechazar ya existía y sirve para reservas externas; agregado: `provider_settings`, buffer de traslado en la reserva, métricas clientes-nuevos y tiempo-en-traslados. Pendiente: pintar slots buffer en el grid A-1 y reasons/proximidad en S-2_ | 1+4 |
| **F5** | 🔨 Recomendación + descuento por proximidad — _lógica (RPC) y lado cliente (BL-4) listos: slots ⭐ contiguos al mismo cantón, primero, con descuento. Pendiente: UI del proveedor para prender el descuento (M-1) y vista por cantones (A-4)_ | 3 |
| **F6** | 🔨 Recordatorios automáticos — _tabla `reminder_jobs`, trigger de encolado al confirmar/completar (24h/2h/rebook), edge `send-reminders` (cron) que envía por WhatsApp. Pendiente: programar el cron en Supabase, toggles SE-4 (ya hay hook), y notificaciones instantáneas solicitud/confirmación (requieren edge pública)_ | 2 |
| **F7** | Dashboard de datos (H-1 stats, SE-5) — _pendiente_ | 4 |
| **F8** | Login OTP WhatsApp proveedor — _pendiente (hoy email/contraseña)_ | — |
| **Agenda UI** | ✅ Grilla semanal nueva `WeeklyAgendaGrid` (horas×días, libre/bloq/cita) + aceptar refresca la grilla (`useProviderAgendaWeek`, key `agenda-week`) | 1 |
| **Onboarding** | ✅ Wizard del proveedor O-2…O-7 (`OnboardingProvider`): tipo, cantón base, catálogo, disponibilidad, zonas, link. Auth email/contraseña | 1 |
| **Infra/calidad** | ✅ Simulador local (Supabase local + `seed_demo.sql`) · tests de integración (`npm test`, 18 checks) · PWA instalable · limpieza de código muerto (pagos/facturas/equipo/residencias) · logout reubicado | — |

---

### Estado para handoff
Ver **[../README.md](../README.md)** (setup) y **[../CLAUDE.md](../CLAUDE.md)** (contexto/convenciones).
El esquema limpio vive en `supabase/rebuild/APPLY_clean_v1.sql` (una migración activa en
`supabase/migrations/`; el historial viejo en `supabase/migrations_legacy/`).

---

*Documento maestro · alinear toda feature nueva con este esquema · v1.1 Junio 2026*
