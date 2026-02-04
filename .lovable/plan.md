

## Problema

El calendario del proveedor muestra un indicador de cita (punto verde) en un día específico (6 de febrero), pero cuando se selecciona ese día, la lista de citas en la línea de tiempo no muestra ninguna cita.

## Causa Raíz

La cita está almacenada con `start_time: 2026-02-06 07:00:00+00` (UTC), lo cual equivale a **01:00 AM en hora local de México (America/Mexico_City)**.

El componente `DayAppointmentsList.tsx` genera una línea de tiempo que solo muestra horas de **6:00 AM a 8:00 PM**:

```javascript
// Line 26
const timeSlots = Array.from({ length: 15 }, (_, i) => i + 6);  // [6, 7, 8, ... 20]
```

Cuando se filtra por hora:
```javascript
// Lines 64-67
const hourAppointments = dayAppointments.filter(apt => {
  const aptHour = new Date(apt.start_time).getHours();  // 1 (AM)
  return aptHour === hour;  // Nunca coincide con 6-20
});
```

La cita a la 1:00 AM no coincide con ningún slot de la línea de tiempo (6-20), por lo que no se renderiza.

## Solución Propuesta

### Opción 1: Expandir el rango de tiempo visible (Recomendada)

Modificar la línea de tiempo para mostrar todas las 24 horas del día:

```javascript
// Antes
const timeSlots = Array.from({ length: 15 }, (_, i) => i + 6);  // 6-20

// Después: 24 horas completas
const timeSlots = Array.from({ length: 24 }, (_, i) => i);  // 0-23
```

**Archivo**: `src/components/calendar/DayAppointmentsList.tsx` (línea 26)

### Opción 2: Rango dinámico basado en citas

Detectar las horas más temprana y más tardía de las citas del día y ajustar el rango automáticamente:

```javascript
// Calcular rango dinámico
const appointmentHours = dayAppointments.map(apt => 
  new Date(apt.start_time).getHours()
);
const minHour = Math.min(6, ...appointmentHours);
const maxHour = Math.max(20, ...appointmentHours) + 1;
const timeSlots = Array.from({ length: maxHour - minHour }, (_, i) => i + minHour);
```

### Consideraciones adicionales

1. **Zona horaria**: El código usa `new Date().getHours()` que devuelve la hora en la zona horaria del navegador del usuario. Si el navegador está en una zona diferente a la esperada, las citas podrían mostrarse en la hora incorrecta. Se recomienda usar `date-fns-tz` para conversiones explícitas de timezone.

2. **UX**: Si se implementa la opción de 24 horas, considerar añadir scroll automático a la hora actual o a la primera cita del día para evitar que el usuario tenga que hacer scroll.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/calendar/DayAppointmentsList.tsx` | Expandir `timeSlots` para cubrir horas fuera del rango 6-20 |

## Criterios de aceptación

1. Las citas programadas fuera del rango 6:00 AM - 8:00 PM deben mostrarse en la lista
2. El indicador de punto en el calendario debe corresponder exactamente con las citas visibles en la lista
3. Las citas deben aparecer en el slot horario correcto según la zona horaria del proveedor

