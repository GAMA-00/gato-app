# send-reminders — Recordatorios automáticos (cron)

Recordatorios automáticos por WhatsApp (concepto v1, pilar #2). Ver
`docs/CONCEPTO_V1.md` §9.

## Qué hace

1. Lee `reminder_jobs` con `status='pending'` y `send_at <= now()` (lote de 50).
2. Para cada uno, arma la plantilla según `kind` y la envía reusando `whatsapp-send`.
3. Marca el job `sent` / `failed` / `skipped` (si la cita fue cancelada o no hay teléfono).

Los jobs los **encola automáticamente** un trigger en `appointments` al confirmar la
cita (24h / 2h antes, según `provider_settings`) y al completarla (`rebook_monthly` a
los 30 días). Ver migración `20260616170000_reminder_jobs.sql`.

## Programación (cron)

Programar cada ~15 min. Con **pg_cron** + **pg_net** en Supabase:

```sql
select cron.schedule(
  'send-reminders-every-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>')
  );
  $$
);
```

(O usar el panel de Supabase → Edge Functions → Scheduled.)

## Plantillas que usa (registrar y aprobar en Meta)

| kind | template | params |
|------|----------|--------|
| `24h` | `recordatorio_24h` | `[hora, proveedor]` |
| `2h` | `recordatorio_2h` | `[proveedor]` |
| `rebook_monthly` | `recordatorio_agendar` | `[proveedor]` |

> `recordatorio_agendar` es nueva respecto a la lista original de 6 plantillas — hay que
> registrarla también. Los textos de referencia están en `docs/SPEC_PRODUCTO_V1.md` §9.
