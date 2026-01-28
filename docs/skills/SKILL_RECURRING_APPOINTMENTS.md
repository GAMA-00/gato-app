# 🛠️ Skill: Trabajar con Citas Recurrentes

## Contexto

Las citas recurrentes permiten a clientes reservar servicios que se repiten automáticamente.

---

## Estructura de Datos

### Tabla: `recurring_rules`

```sql
-- Regla base que define la recurrencia
id UUID
client_id UUID
provider_id UUID  
listing_id UUID
recurrence_type TEXT  -- 'weekly', 'biweekly', 'monthly'
day_of_week INTEGER   -- 0-6 (domingo-sábado)
day_of_month INTEGER  -- 1-31 (solo para monthly)
start_date DATE
start_time TIME
end_time TIME
is_active BOOLEAN
```

### Tabla: `recurring_instances`

```sql
-- Instancias generadas de la regla
id UUID
recurring_rule_id UUID
instance_date DATE
start_time TIME
end_time TIME
status TEXT  -- 'scheduled', 'completed', 'skipped', 'cancelled'
```

### Tabla: `onvopay_subscriptions`

```sql
-- Suscripción de pago recurrente
id UUID
client_id UUID
provider_id UUID
recurring_rule_id UUID
interval_type TEXT  -- 'week', 'month'
interval_count INTEGER
next_charge_date DATE
status TEXT
```

---

## Flujo de Creación

```
1. Cliente reserva servicio recurrente
   │
   ▼
2. onvopay-initiate-recurring
   - Crea appointment inicial
   - Crea recurring_rule
   │
   ▼
3. onvopay-authorize (primer pago)
   │
   ▼
4. onvopay-create-subscription
   - Crea onvopay_subscription
   │
   ▼
5. onvopay-create-loop
   - Crea loop en OnvoPay API
```

---

## Hooks Relevantes

```typescript
// Crear reserva recurrente
useRecurringBooking()

// Obtener reglas del proveedor
useProviderRecurringRules()

// Excepciones (saltar/reagendar)
useRecurringExceptions()

// Sistema de slots recurrentes
useRecurringSlotSystem()
```

---

## Operaciones Comunes

### Saltar una instancia

```typescript
// Edge function: skip-recurring-instance
// Input: { recurring_rule_id, instance_date }
// Acción: Crea excepción + no cobra ese ciclo
```

### Cancelar serie completa

```typescript
// Edge function: cancel-recurring-series
// Input: { recurring_rule_id }
// Acción: Desactiva regla + cancela suscripción OnvoPay
```

### Reagendar instancia

```typescript
// Se crea una excepción con nuevo horario
INSERT INTO recurring_exceptions (
  appointment_id,
  exception_date,
  action_type,  -- 'reschedule'
  new_start_time,
  new_end_time
);
```

---

## Cobros Automáticos

### Proceso diario

```
onvopay-process-recurring-charges (scheduled)
   │
   ▼
1. Busca subscriptions con next_charge_date = hoy
   │
   ▼
2. Para cada una:
   - Crear appointment para próxima fecha
   - Cobrar via OnvoPay loop
   - Actualizar next_charge_date
   │
   ▼
3. Manejar fallos:
   - Reintentar N veces
   - Notificar si falla definitivamente
```

---

## Consultas Útiles

```sql
-- Reglas activas de un proveedor
SELECT * FROM recurring_rules
WHERE provider_id = 'UUID'
AND is_active = true;

-- Próximas instancias
SELECT * FROM recurring_instances
WHERE instance_date >= CURRENT_DATE
AND status = 'scheduled'
ORDER BY instance_date;

-- Suscripciones con cobro pendiente
SELECT * FROM onvopay_subscriptions
WHERE next_charge_date <= CURRENT_DATE
AND status = 'active';
```

---

## Checklist Debug

- [ ] Verificar `recurring_rules.is_active = true`
- [ ] Verificar `onvopay_subscriptions.status = 'active'`
- [ ] Verificar que loop existe en OnvoPay
- [ ] Revisar `recurring_exceptions` para fechas saltadas
- [ ] Verificar método de pago válido
