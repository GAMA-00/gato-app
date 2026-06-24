# Rebuild limpio v1 — esquema desde cero

Esquema **curado** de Gato para el concepto v1: solo lo que se usa, sin las tablas/
funciones muertas (pagos OnvoPay, facturas, residencias, etc.), con el bug de timezone
arreglado (`America/Costa_Rica`) y las features v1 incluidas.

## Archivo a aplicar

**`APPLY_clean_v1.sql`** — todo en uno. Pegar en el **SQL Editor** de un proyecto
Supabase **nuevo** y darle Run. (En un proyecto nuevo `auth.users`, `auth.uid()` y los
roles ya existen, por eso no incluye el prelude.)

Validado: aplica sin errores en Postgres 15 aislado. Crea 18 tablas, 4 vistas, 20
triggers, las funciones vitales, 7 provincias + 84 cantones, y las columnas v1.

## Piezas (por si querés revisarlas por separado)

| Archivo | Qué trae |
|---------|----------|
| `01_tables.sql` | 13 tablas vitales + enum `app_role` |
| `02_functions.sql` | ~35 funciones vitales (slots, recurrencia, ratings, `handle_new_user` reescrito) |
| `03_views.sql` | vistas adaptadas (sin columnas muertas) |
| `04_triggers.sql` | triggers vitales (+ `on_auth_user_created`) |
| `05_rls.sql` | RLS nueva y simple |
| (migraciones `20260616*`) | las 6 de v1: cantones, booking link, settings, proximidad, recordatorios |
| `_local_test_prelude.sql` | SOLO para probar local (simula `auth`); NO va a Supabase |

## Tablas que se quitaron (muertas en v1)

onvopay_payments/subscriptions/webhooks/customers, payment_methods, price_history,
invoices, post_payment_invoices/items/evidence, residencias, condominiums,
provider_residencias, listing_residencias, clients, providers, team_members,
cancellation_policies, email_logs, recurring_instances (dup), provider_slot_preferences,
admin_stat_offsets, system_settings.

## Pasos para dejarlo andando

1. Crear proyecto Supabase nuevo (dashboard).
2. Aplicar `APPLY_clean_v1.sql` en su SQL Editor.
3. Apuntar el frontend al proyecto nuevo: crear `.env.local` con
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del proyecto nuevo, y reiniciar `npm run dev`.
4. **Pendiente (fase aparte):** sacar el código viejo del frontend que toca tablas
   muertas (pagos, facturas, residencias) para que no truene.
5. **Pendiente:** desplegar edge functions (whatsapp-send, send-reminders, …) + secrets.

> ⚠️ El esquema viejo de producción NO se toca. Esto es para un proyecto nuevo limpio.
