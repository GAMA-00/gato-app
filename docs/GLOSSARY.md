# 📖 Glosario - Gato App

## Términos de Negocio

| Término | Definición |
|---------|------------|
| **Appointment** | Una cita/reserva entre un cliente y proveedor |
| **Booking** | Sinónimo de Appointment (usado en UI de cliente) |
| **Client** | Usuario que reserva servicios |
| **Provider** | Usuario que ofrece servicios |
| **Listing** | Un servicio publicado por un proveedor |
| **Residencia** | Comunidad/edificio donde viven clientes |
| **Condominium** | Subdivisión dentro de una residencia |
| **Slot** | Espacio de tiempo disponible para reservar |
| **Post-Payment** | Servicio que se paga después de completar |
| **Recurring** | Cita que se repite (semanal, mensual, etc.) |

## Estados de Appointment

| Estado | Descripción |
|--------|-------------|
| `pending` | Esperando que proveedor acepte |
| `confirmed` | Proveedor aceptó, esperando servicio |
| `completed` | Servicio terminado |
| `cancelled` | Cancelado por cliente o proveedor |
| `rejected` | Rechazado por proveedor |
| `rescheduled` | Reagendado |

## Estados de Pago

| Estado | Descripción |
|--------|-------------|
| `pending` | Pago iniciado |
| `pending_authorization` | Esperando 3DS |
| `authorized` | Autorizado, no capturado |
| `captured` | Dinero cobrado |
| `failed` | Falló |
| `cancelled` | Cancelado |
| `refunded` | Reembolsado |

## Términos Técnicos

| Término | Definición |
|---------|------------|
| **Edge Function** | Función serverless en Supabase (Deno) |
| **RLS** | Row Level Security - políticas de acceso a filas |
| **OnvoPay** | Procesador de pagos de Costa Rica |
| **Payment Intent** | Intención de pago en OnvoPay |
| **Loop** | Ciclo de cobro recurrente en OnvoPay |
| **3DS** | 3D Secure - verificación de tarjeta |
| **Webhook** | Notificación HTTP de eventos |

## Abreviaciones

| Abreviación | Significado |
|-------------|-------------|
| `apt` | Appointment |
| `TZ` | Timezone (America/Costa_Rica) |
| `CRC` | Colones (moneda Costa Rica) |
| `USD` | Dólares estadounidenses |
| `RLS` | Row Level Security |
| `JWT` | JSON Web Token |
