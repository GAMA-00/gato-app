# Testing rápido — Gato simulador

## Correr todos los tests (1 comando)

```bash
npm test
```

Esto verifica Docker, levanta Supabase local si hace falta, y corre la suite de
integración contra la base local. Salida esperada: `N pasaron, 0 fallaron`.

> Requisito: **Docker Desktop abierto**. Si está cerrado, el script te avisa
> (`open -a Docker`, esperá ~1 min, reintentá).

## Qué cubre la suite (`tests/integration.mjs`)

- Geografía (7 provincias, 84 cantones)
- Booking link público (`get_provider_by_slug`, settings de descuento)
- Crear reserva de invitado + nombre preservado + entra `pending`
- Doble-reserva del mismo horario rechazada
- Aceptar cita (→ `confirmed`)
- Recordatorio 24h encolado al confirmar
- Recordatorio mensual (rebook) encolado al completar
- Cancelar cita
- Proximidad: recomienda slots por cantón
- Bloquear / desbloquear slot
- RLS: anon no puede modificar citas ajenas

## Agregar un test

Editá `tests/integration.mjs` y agregá un bloque con `check('nombre', condicion)`.
Usa el cliente `svc` (service role, para setup) o `anon` (para probar el camino público).
Limpiá lo que crees al final.

## Levantar el simulador a mano

```bash
open -a Docker                                   # esperá ~1 min
~/.local/share/supabase/supabase start           # base local
npm run dev                                       # app en http://localhost:8080
```

- App: http://localhost:8080
- Booking link demo: http://localhost:8080/demo
- Studio (ver la base): http://127.0.0.1:54323
- Login demo proveedor: `demo@gato.app` / `gato1234`
