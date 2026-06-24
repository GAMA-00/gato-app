# 📖 Glosario - Gato App

> Términos marcados 🆕 son del nuevo concepto v1 (ver `CONCEPTO_V1.md`).

## Términos de Negocio

| Término | Definición |
|---------|------------|
| **Appointment** | Una cita/reserva entre un cliente y proveedor |
| **Booking** | Sinónimo de Appointment (usado en UI de cliente) |
| **Client** | Usuario que reserva servicios |
| **Provider** | Usuario que ofrece servicios |
| **Listing** | Un servicio publicado por un proveedor |
| **Residencia** | Comunidad/edificio donde viven clientes (modelo legacy, coexiste) |
| **Condominium** | Subdivisión dentro de una residencia |
| **Slot** | Espacio de tiempo disponible para reservar (30 min) |
| **Post-Payment** | Servicio que se paga después de completar |
| **Recurring** | Cita que se repite (semanal, mensual, etc.) |
| 🆕 **Provincia** | Una de las 7 provincias de Costa Rica |
| 🆕 **Cantón** | Una de las 84 unidades geográficas de CR; base de ubicación y rutas |
| 🆕 **Centroide** | Centro geográfico de un cantón; punto para calcular distancias |
| 🆕 **Cantón base** | Cantón de residencia del proveedor (nunca su dirección exacta) |
| 🆕 **Zona de trabajo** | Cantones donde el proveedor acepta solicitudes (`provider_cantones`) |
| 🆕 **Booking Link** | URL pública `gato.app/{slug}` para reservar sin login |
| 🆕 **Slug** | Identificador del proveedor en su booking link |
| 🆕 **OTP** | Código de 6 dígitos por WhatsApp para login sin contraseña (proveedor) |
| 🆕 **Buffer de traslado** | Slot extra (default 30 min) bloqueado tras cada cita |
| 🆕 **Slot recomendado (⭐)** | Slot contiguo a una cita en el mismo cantón (ruta eficiente) |
| 🆕 **Descuento por proximidad** | Descuento % automático en slots recomendados |
| 🆕 **Cliente invitado (guest)** | Cliente que reserva por el booking link sin cuenta |

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
| **OnvoPay** | Procesador de pagos de Costa Rica (presente, **oculto en v1**) |
| **Payment Intent** | Intención de pago en OnvoPay |
| **Loop** | Ciclo de cobro recurrente en OnvoPay |
| **3DS** | 3D Secure - verificación de tarjeta |
| **Webhook** | Notificación HTTP de eventos |
| 🆕 **WhatsApp Cloud API** | API de Meta para enviar/recibir mensajes (canal único al cliente) |
| 🆕 **Plantilla (template)** | Mensaje pre-aprobado por Meta para enviar fuera de la ventana de 24h |
| 🆕 **Ventana de 24h** | Período tras un mensaje del cliente en que se puede responder con texto libre |
| 🆕 **Geocoding inverso** | Convertir coordenadas GPS en un cantón |
| 🆕 **Haversine** | Fórmula para distancia entre dos coordenadas (km) |

## Abreviaciones

| Abreviación | Significado |
|-------------|-------------|
| `apt` | Appointment |
| `TZ` | Timezone (America/Costa_Rica) |
| `CRC` | Colones (moneda Costa Rica) |
| `USD` | Dólares estadounidenses |
| `RLS` | Row Level Security |
| `JWT` | JSON Web Token |
