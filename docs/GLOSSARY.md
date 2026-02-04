# 📖 Glosario - Gato App

> **Última actualización:** Febrero 2026  
> **Versión:** 2.0 DOE

## 🏢 Términos de Negocio

| Término | Definición |
|---------|------------|
| **Appointment** | Una cita/reserva entre un cliente y proveedor para un servicio específico |
| **Booking** | Sinónimo de Appointment (usado principalmente en UI de cliente) |
| **Client** | Usuario que reserva y paga por servicios a domicilio |
| **Provider** | Usuario profesional que ofrece servicios a domicilio |
| **Admin** | Administrador de la plataforma con acceso total |
| **Listing** | Un servicio publicado por un proveedor, con precio, duración y disponibilidad |
| **Service** | Tipo de trabajo ofrecido (limpieza, jardinería, etc.) |
| **Residencia** | Comunidad residencial, condominio o edificio donde viven clientes |
| **Condominium** | Subdivisión dentro de una residencia (torre, sección, bloque) |
| **Slot** | Espacio de tiempo disponible para reservar (ej: 9:00-9:30) |
| **Team Member** | Auxiliar que trabaja con un proveedor |

---

## 📅 Estados de Appointment

| Estado | Código | Descripción | Siguiente Estado |
|--------|--------|-------------|------------------|
| Pendiente | `pending` | Esperando que proveedor acepte | confirmed/rejected |
| Confirmada | `confirmed` | Proveedor aceptó, esperando servicio | completed/cancelled |
| Completada | `completed` | Servicio terminado exitosamente | - (final) |
| Cancelada | `cancelled` | Cancelado por cliente o proveedor | - (final) |
| Rechazada | `rejected` | Rechazado por proveedor | - (final) |
| Reagendada | `rescheduled` | Movida a otra fecha/hora | pending |

### Flujo de Estados

```
Cliente reserva → pending → Provider acepta → confirmed → Servicio termina → completed
                    │                             │
                    ▼                             ▼
                rejected                      cancelled
                    │                             │
                    └─────── (estados finales) ───┘
```

---

## 💳 Estados de Pago

| Estado | Código | Descripción |
|--------|--------|-------------|
| Pendiente | `pending` | Pago iniciado, esperando procesamiento |
| Pendiente Autorización | `pending_authorization` | Esperando verificación 3DS |
| Autorizado | `authorized` | Autorizado, fondos retenidos, no capturado |
| Capturado | `captured` | Dinero cobrado exitosamente |
| Fallido | `failed` | Error en procesamiento |
| Cancelado | `cancelled` | Cancelado antes de capturar |
| Reembolsado | `refunded` | Dinero devuelto al cliente |

### Tipos de Pago

| Tipo | Descripción |
|------|-------------|
| **Pre-pago** | Cliente paga al reservar, proveedor acepta para capturar |
| **Post-pago** | Cliente reserva sin pagar, se cobra al completar servicio |
| **Recurrente** | Cobros automáticos periódicos (semanal, mensual) |

---

## 🔄 Términos de Recurrencia

| Término | Definición |
|---------|------------|
| **Recurring Rule** | Regla que define patrón de repetición (día, hora, frecuencia) |
| **Recurring Instance** | Una ocurrencia específica de una regla recurrente |
| **Loop** | Ciclo de cobro automático en OnvoPay |
| **Subscription** | Registro de suscripción de pago recurrente |
| **Exception** | Modificación a una instancia (saltar, reagendar) |

### Tipos de Recurrencia

| Tipo | Código | Descripción |
|------|--------|-------------|
| Semanal | `weekly` | Mismo día cada semana |
| Bisemanal | `biweekly` | Cada dos semanas |
| Mensual | `monthly` | Mismo día del mes |

---

## 🎖️ Sistema de Niveles

| Nivel | Código | Requisitos |
|-------|--------|------------|
| Principiante | `beginner` | 0-49 puntos |
| Confiable | `trusty` | 50-199 puntos |
| Recomendado | `recommended` | 200-499 puntos |
| Experto | `expert` | 500+ puntos |

### Cómo se Ganan Puntos

- Completar servicios
- Recibir calificaciones positivas
- Mantener tasa baja de cancelación
- Tiempo en la plataforma

---

## 💰 Términos Financieros

| Término | Definición |
|---------|------------|
| **Commission** | Porcentaje que cobra Gato App por transacción |
| **IVA** | Impuesto al Valor Agregado (Costa Rica) |
| **Subtotal** | Precio antes de impuestos y comisiones |
| **Invoice** | Factura generada por servicio completado |
| **Refund** | Devolución de dinero al cliente |
| **Payout** | Transferencia de fondos al proveedor |

### Monedas Soportadas

| Código | Nombre | Símbolo |
|--------|--------|---------|
| `CRC` | Colón Costarricense | ₡ |
| `USD` | Dólar Estadounidense | $ |

---

## ⚙️ Términos Técnicos

| Término | Definición |
|---------|------------|
| **Edge Function** | Función serverless ejecutada en Supabase (Deno runtime) |
| **RLS** | Row Level Security - políticas de acceso a filas en PostgreSQL |
| **JWT** | JSON Web Token - token de autenticación |
| **Webhook** | Notificación HTTP automática de eventos externos |
| **3DS** | 3D Secure - verificación adicional de tarjeta de crédito |
| **Payment Intent** | Intención de pago en procesador (OnvoPay) |
| **Slot Generation** | Proceso de crear slots disponibles automáticamente |
| **Query Invalidation** | Refrescar datos en caché de TanStack Query |

### Servicios Externos

| Servicio | Propósito |
|----------|-----------|
| **Supabase** | Backend-as-a-Service (DB, Auth, Storage, Functions) |
| **OnvoPay** | Procesador de pagos para Costa Rica |
| **Resend** | Envío de emails transaccionales |
| **Lovable** | Plataforma de desarrollo y hosting |

---

## 📱 Términos de UI/UX

| Término | Definición |
|---------|------------|
| **Token** | Variable de diseño reutilizable (color, spacing, etc.) |
| **Component** | Pieza de UI encapsulada y reutilizable |
| **Variant** | Variación de estilo de un componente (ej: button outline) |
| **Sheet** | Panel deslizable desde el borde (mobile) |
| **Toast** | Notificación temporal en esquina de pantalla |
| **Skeleton** | Placeholder animado mientras carga contenido |
| **Empty State** | UI mostrada cuando no hay datos |

---

## 🗂️ Abreviaciones

| Abreviación | Significado |
|-------------|-------------|
| `apt` | Appointment |
| `TZ` | Timezone |
| `RLS` | Row Level Security |
| `JWT` | JSON Web Token |
| `CRC` | Colón (moneda) |
| `USD` | Dólar (moneda) |
| `3DS` | 3D Secure |
| `DOE` | Document-Oriented Engineering |
| `UI` | User Interface |
| `UX` | User Experience |
| `DB` | Database |
| `API` | Application Programming Interface |
| `CRUD` | Create, Read, Update, Delete |
| `SSR` | Server-Side Rendering |
| `CSR` | Client-Side Rendering |

---

## 🕐 Timezone

El proyecto usa **America/Mexico_City** (UTC-6) como zona horaria principal para:

- Generación de slots
- Mostrar fechas/horas a usuarios
- Cálculo de cobros recurrentes

```
Ejemplo:
- Slot guardado en DB: 2026-02-05 13:00:00+00 (UTC)
- Mostrado al usuario: 7:00 AM (hora local)
```

---

## 📝 Convenciones de Naming

| Contexto | Convención | Ejemplo |
|----------|------------|---------|
| Componentes React | PascalCase | `BookingCard` |
| Hooks | camelCase + use | `useAppointments` |
| Edge Functions | kebab-case | `onvopay-capture` |
| Tablas DB | snake_case | `provider_time_slots` |
| Columnas DB | snake_case | `created_at` |
| Types TS | PascalCase | `AppointmentStatus` |
| Constantes | UPPER_SNAKE | `MAX_RETRY_ATTEMPTS` |
