
# Plan: Corrección de Errores Críticos en Sistema de Reservas

## Resumen de Problemas Identificados

### Problema 1: Ciclo Infinito de Carga de Slots
**Causa Raíz:** La base de datos contiene una mezcla de slots de 30 y 60 minutos debido a la migración incompleta. De 8 listings analizados:
- 5 listings tienen **solo slots de 60 minutos** (0 slots de 30 min)
- 2 listings tienen **solo slots de 30 minutos**
- 1 listing tiene **mezcla** (218 de 30min + 2 de 60min)

La función SQL fue actualizada para generar slots de 30 min, pero los slots existentes de 60 min no fueron regenerados. Cuando el frontend busca slots de 30 min y la DB retorna slots de 60 min, el hook no encuentra disponibilidad válida y dispara el lookahead infinitamente.

### Problema 2: Falta de Diferenciación Visual en Slots Seleccionados
**Causa Raíz:** El componente `SlotCard` tiene estilos correctos definidos para el estado `isSelected`, pero el color `coral` (usado para la selección) es visualmente muy similar al color del borde y hover de los slots no seleccionados, especialmente en fondos claros.

Los estilos actuales para slot seleccionado son:
```typescript
'bg-coral text-white border-coral hover:bg-coral hover:text-white shadow-lg ring-2 ring-coral/20'
```

Estos estilos funcionan, pero necesitan mayor contraste y elementos visuales adicionales (como un ícono de check) para mejorar la claridad.

---

## Solución Propuesta

### FASE 1: Regeneración Forzada de Slots de 60 a 30 Minutos

**Objetivo:** Regenerar todos los slots de 60 minutos a 30 minutos sin afectar reservas existentes.

**Archivo:** Nueva migración SQL

**Implementación:**
```sql
-- Paso 1: Eliminar slots de 60 minutos que NO están reservados
DELETE FROM provider_time_slots
WHERE slot_date >= CURRENT_DATE
  AND is_reserved = false
  AND slot_type != 'manually_blocked'
  AND EXTRACT(EPOCH FROM (slot_datetime_end - slot_datetime_start))/60 = 60;

-- Paso 2: Regenerar slots para cada listing afectado
DO $$
DECLARE
  v_listing RECORD;
BEGIN
  FOR v_listing IN 
    SELECT DISTINCT l.id, l.provider_id 
    FROM listings l
    WHERE l.is_active = true
  LOOP
    PERFORM generate_provider_time_slots_for_listing(v_listing.provider_id, v_listing.id);
  END LOOP;
END;
$$;
```

---

### FASE 2: Mejora Visual de Slots Seleccionados

**Objetivo:** Hacer que la selección de slots sea inequívoca y altamente visible.

**Archivo:** `src/components/services/steps/SlotCard.tsx`

**Cambios:**

1. **Agregar icono de check para slots seleccionados:**
   - Importar `Check` de `lucide-react`
   - Mostrar icono prominente cuando `isSelected = true`

2. **Mejorar contraste de colores:**
   - Cambiar de `bg-coral` a `bg-primary` (más consistente con el sistema)
   - Agregar borde más grueso (`border-2`) 
   - Añadir sombra más prominente para el estado seleccionado
   - Usar animación de escala más notoria

3. **Código actualizado:**
```typescript
import { Check } from 'lucide-react';

// En getButtonStyles():
if (isSelected) {
  return 'bg-primary text-primary-foreground border-2 border-primary hover:bg-primary hover:text-primary-foreground shadow-lg ring-2 ring-primary/30';
}

// En el render:
{isSelected && variant === 'client' && (
  <span className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-md">
    <Check className="h-3 w-3 text-primary" strokeWidth={3} />
  </span>
)}
```

---

### FASE 3: Prevención del Ciclo Infinito de Lookahead

**Objetivo:** Evitar que el lookahead se dispare continuamente cuando no hay slots.

**Archivo:** `src/components/client/booking/WeeklySlotGrid.tsx`

**Cambios:**

1. **Agregar flag para evitar re-ejecución:**
```typescript
const [hasSearchedAllWeeks, setHasSearchedAllWeeks] = useState(false);

// En lookAheadForAvailability:
// Al final del loop, si no encuentra nada:
setHasSearchedAllWeeks(true);

// En el useEffect que dispara lookahead:
if (!isLoading && availableSlotGroups.length === 0 && !isLookingAhead && nextAvailableWeek === null && !hasSearchedAllWeeks) {
  // ...trigger lookahead
}
```

2. **Reset del flag cuando cambia el listing:**
```typescript
useEffect(() => {
  setHasSearchedAllWeeks(false);
  setNextAvailableWeek(null);
}, [listingId, providerId]);
```

---

## Archivos a Modificar

| Archivo | Tipo | Prioridad |
|---------|------|-----------|
| Nueva migración SQL | Crear | CRÍTICA |
| `src/components/services/steps/SlotCard.tsx` | Modificar | ALTA |
| `src/components/client/booking/WeeklySlotGrid.tsx` | Modificar | ALTA |

---

## Beneficios Esperados

1. **Consistencia de datos:** Todos los slots serán de 30 minutos
2. **Carga correcta:** Los listings mostrarán sus slots sin ciclos infinitos
3. **UX clara:** Los usuarios verán claramente qué slot han seleccionado con icono de check y colores distintivos
4. **Prevención de loops:** El lookahead solo se ejecutará una vez por sesión de búsqueda

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Pérdida de slots reservados | La migración solo elimina slots con `is_reserved = false` |
| Slots manualmente bloqueados | Se preservan con filtro `slot_type != 'manually_blocked'` |
| Performance de regeneración | Se ejecuta solo una vez como migración, no en cada request |
