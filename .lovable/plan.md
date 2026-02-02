
# Plan: Corrección de Etiquetas de Recurrencia Incorrectas

## Problema Identificado

En el calendario del proveedor, las citas de servicio único muestran incorrectamente la etiqueta "Recurrente" (genérico) en lugar de no mostrar etiqueta o mostrar el tipo específico de recurrencia.

### Causa Raíz

Hay **3 problemas principales** en la lógica de detección de recurrencia:

### Problema 1: `DayAppointmentsList.tsx` (línea 28)
```typescript
// INCORRECTO - Cualquier valor truthy en recurrence activa la etiqueta
const isRecurring = (apt: any) => apt.is_recurring_instance || apt.recurrence;
```
Esta lógica es incorrecta porque:
- `apt.recurrence` puede ser `'none'` o `'once'` (valores truthy pero NO recurrentes)
- Muestra etiqueta genérica "Recurrente" en lugar del tipo específico

### Problema 2: `AppointmentDisplay.tsx` (línea 80)
```typescript
// Misma lógica incorrecta
const appointmentIsRecurring = appointment.is_recurring_instance || isRecurring(appointment.recurrence);
```
Aunque usa la utilidad `isRecurring()`, también incluye `is_recurring_instance` sin verificar el campo `recurrence`.

### Problema 3: `useGroupedPendingRequests.ts` (líneas 123-128)
```typescript
// Fallback genérico "Recurrente" - NUNCA debe mostrarse
recurrence_label: 
  appointment.recurrence === 'weekly' ? 'Semanal' :
  appointment.recurrence === 'biweekly' ? 'Quincenal' :
  appointment.recurrence === 'triweekly' ? 'Trisemanal' :
  appointment.recurrence === 'monthly' ? 'Mensual' :
  appointment.recurrence && appointment.recurrence !== 'none' ? 'Recurrente' : null
```
Existe un fallback que muestra "Recurrente" si el tipo no coincide con los esperados.

---

## Solución

### Cambio 1: `DayAppointmentsList.tsx`

**Archivo**: `src/components/calendar/DayAppointmentsList.tsx`

Reemplazar la lógica de detección y mostrar el tipo específico:

```typescript
// ANTES (línea 28)
const isRecurring = (apt: any) => apt.is_recurring_instance || apt.recurrence;

// DESPUÉS
import { isRecurring as checkIsRecurring, getRecurrenceInfo } from '@/lib/recurrence';

// Función para obtener etiqueta de recurrencia específica
const getRecurrenceLabel = (apt: any): string | null => {
  const recurrence = apt.recurrence;
  if (!checkIsRecurring(recurrence)) return null;
  
  const info = getRecurrenceInfo(recurrence);
  return info.label; // 'Semanal', 'Quincenal', 'Trisemanal', 'Mensual'
};
```

Y actualizar el JSX para mostrar la etiqueta específica:
```tsx
// ANTES (línea 86-91)
{isRecurring(apt) && (
  <span className="...">
    <Repeat className="h-3 w-3" />
    Recurrente
  </span>
)}

// DESPUÉS
{(() => {
  const label = getRecurrenceLabel(apt);
  return label ? (
    <span className="...">
      <Repeat className="h-3 w-3" />
      {label}
    </span>
  ) : null;
})()}
```

### Cambio 2: `AppointmentDisplay.tsx`

**Archivo**: `src/components/calendar/AppointmentDisplay.tsx`

Corregir la lógica de detección (línea 80):

```typescript
// ANTES
const appointmentIsRecurring = appointment.is_recurring_instance || isRecurring(appointment.recurrence);

// DESPUÉS - Solo usar la utilidad centralizada que ya verifica correctamente
const appointmentIsRecurring = isRecurring(appointment.recurrence);
```

Esto asegura que `is_recurring_instance` no active falsamente la etiqueta cuando `recurrence` es `'none'` o `'once'`.

### Cambio 3: `useGroupedPendingRequests.ts`

**Archivo**: `src/hooks/useGroupedPendingRequests.ts`

Eliminar el fallback genérico "Recurrente" (líneas 123-128):

```typescript
// ANTES
recurrence_label: 
  appointment.recurrence === 'weekly' ? 'Semanal' :
  appointment.recurrence === 'biweekly' ? 'Quincenal' :
  appointment.recurrence === 'triweekly' ? 'Trisemanal' :
  appointment.recurrence === 'monthly' ? 'Mensual' :
  appointment.recurrence && appointment.recurrence !== 'none' ? 'Recurrente' : null

// DESPUÉS - Usar utilidad centralizada sin fallback genérico
import { isRecurring, getRecurrenceInfo } from '@/lib/recurrence';

recurrence_label: isRecurring(appointment.recurrence) 
  ? getRecurrenceInfo(appointment.recurrence).label 
  : null
```

---

## Resumen de Cambios

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `DayAppointmentsList.tsx` | 1-4, 27-28, 86-91 | Agregar import, usar `getRecurrenceInfo()`, mostrar etiqueta específica |
| `AppointmentDisplay.tsx` | 80 | Eliminar `is_recurring_instance` de la condición |
| `useGroupedPendingRequests.ts` | 6, 123-128 | Agregar import, usar utilidades centralizadas |

---

## Comportamiento Esperado Después del Fix

| Tipo de Cita | Valor `recurrence` | Etiqueta Mostrada |
|--------------|-------------------|-------------------|
| Una vez | `'none'` o `'once'` | (sin etiqueta) |
| Semanal | `'weekly'` | "Semanal" |
| Quincenal | `'biweekly'` | "Quincenal" |
| Cada 3 semanas | `'triweekly'` | "Trisemanal" |
| Mensual | `'monthly'` | "Mensual" |

---

## Verificación

1. Crear una cita de servicio único (`recurrence: 'none'`)
2. Verificar que NO muestre etiqueta de recurrencia en el calendario
3. Crear una cita recurrente semanal
4. Verificar que muestre "Semanal" (no "Recurrente")
5. Revisar panel de solicitudes pendientes
6. Verificar consistencia en todas las vistas del proveedor

---

## Impacto

- Etiquetas precisas y consistentes en toda la aplicación
- Mejor experiencia de usuario para proveedores
- Eliminación de la etiqueta genérica "Recurrente" que no aporta información útil
- Uso consistente de las utilidades centralizadas de recurrencia (`@/lib/recurrence`)
