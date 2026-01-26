
## Plan: Corregir Deselección de Slots en Móvil (Específico para "Dani Nail Artist")

### Problema Identificado

El anuncio "Dani Nail Artist" tiene una configuración única que amplifica un bug existente:

| Configuración | Dani Nail Artist | Otros Anuncios |
|--------------|------------------|----------------|
| `slot_size` | **30 minutos** | 60 minutos |
| Variantes | 12 (duraciones 30-120 min) | 1-6 |
| Slots necesarios | 2-4 por servicio | 1 típicamente |

### Causa Raíz

Existe una **race condition** en `WeeklySlotGrid.tsx` donde el componente mantiene **estado local duplicado** que se sincroniza con el padre:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO PROBLEMÁTICO                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Usuario toca slot en móvil                                              │
│           │                                                                 │
│           ▼                                                                 │
│  2. handleSlotClick valida contigüidad (toma más tiempo con 30-min slots)   │
│           │                                                                 │
│           ▼                                                                 │
│  3. setSelectedSlotIds(consecutiveSlotIds) - actualiza estado LOCAL         │
│           │                                                                 │
│           ▼                                                                 │
│  4. onSlotSelect() notifica al padre                                        │
│           │                                                                 │
│           ▼                                                                 │
│  5. Padre actualiza SU estado y re-renderiza                                │
│           │                                                                 │
│           ▼                                                                 │
│  6. useEffect en WeeklySlotGrid: setSelectedSlotIds(selectedSlots)          │
│     ⚠️ El prop puede estar DESFASADO → sobrescribe selección correcta       │
│           │                                                                 │
│           ▼                                                                 │
│  7. El slot aparece deseleccionado                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Por Qué Afecta Más a "Dani Nail Artist"

1. **Más procesamiento**: Con `slot_size: 30`, se necesitan 2-4 slots consecutivos (vs 1 con 60-min slots)
2. **Más validaciones**: El loop de contigüidad (líneas 192-223) ejecuta más iteraciones
3. **Más re-renders**: Cada slot adicional puede causar re-renders intermedios
4. **Mayor probabilidad de race condition**: El tiempo extra da más oportunidad al `useEffect` de dispararse con valores obsoletos

---

### Solución: Componente Totalmente Controlado

Convertir `WeeklySlotGrid` en un **componente controlado** donde el padre es la única fuente de verdad.

#### Archivo a Modificar

**`src/components/client/booking/WeeklySlotGrid.tsx`**

#### Cambios Específicos

| Línea | Acción | Descripción |
|-------|--------|-------------|
| 53 | **ELIMINAR** | `const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>(selectedSlots);` |
| 59-61 | **ELIMINAR** | El `useEffect` de sincronización |
| 231 | **ELIMINAR** | `setSelectedSlotIds(consecutiveSlotIds);` |
| 253-254 | **MODIFICAR** | Eliminar `setSelectedSlotIds([]);` en `goToPreviousWeek` |
| 261-262 | **MODIFICAR** | Eliminar `setSelectedSlotIds([]);` en `goToNextWeek` |
| 512 | **MODIFICAR** | Cambiar `selectedSlotIds.includes(slot.id)` → `selectedSlots.includes(slot.id)` |

#### Código Antes vs Después

**ANTES (estado duplicado):**
```typescript
// Línea 53
const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>(selectedSlots);

// Líneas 59-61 - PROBLEMA: causa race condition
React.useEffect(() => {
  setSelectedSlotIds(selectedSlots);
}, [selectedSlots]);

// Línea 231 - Dentro de handleSlotClick
setSelectedSlotIds(consecutiveSlotIds);
onSlotSelect(consecutiveSlotIds, slot.date, slot.time, totalDurationReserved);

// Línea 512 - Usa estado local (puede estar desfasado)
isSelected={selectedSlotIds.includes(slot.id)}
```

**DESPUÉS (componente controlado):**
```typescript
// Sin estado local para selectedSlotIds
// Usar directamente selectedSlots del prop

// En handleSlotClick - solo notificar al padre
onSlotSelect(consecutiveSlotIds, slot.date, slot.time, totalDurationReserved);

// En goToPreviousWeek y goToNextWeek
onSlotSelect([], new Date(), '', 0);  // El padre maneja la limpieza

// En SlotCard - usar prop directamente
isSelected={selectedSlots.includes(slot.id)}
```

---

### Flujo Corregido

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO CORREGIDO                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Usuario toca slot                                                       │
│           │                                                                 │
│           ▼                                                                 │
│  2. handleSlotClick valida contigüidad                                      │
│           │                                                                 │
│           ▼                                                                 │
│  3. onSlotSelect() notifica al padre (SIN actualizar estado local)          │
│           │                                                                 │
│           ▼                                                                 │
│  4. Padre actualiza selectedSlotIds                                         │
│           │                                                                 │
│           ▼                                                                 │
│  5. Padre re-renderiza WeeklySlotGrid con nuevo selectedSlots prop          │
│           │                                                                 │
│           ▼                                                                 │
│  6. isSelected={selectedSlots.includes(slot.id)} muestra selección          │
│           │                                                                 │
│           ▼                                                                 │
│  7. ✅ Slot permanece seleccionado correctamente                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Beneficios

1. **Elimina la race condition**: Un solo lugar (el padre) controla el estado
2. **Consistencia en todos los dispositivos**: No depende de timing de renderizado
3. **Funciona igual con slots de 30 o 60 minutos**: La solución es agnóstica al tamaño
4. **Código más simple y mantenible**: Patrón React estándar de "componente controlado"

---

### Sección Técnica: Resumen de Cambios

```typescript
// WeeklySlotGrid.tsx - Cambios detallados

// 1. ELIMINAR línea 53:
// const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>(selectedSlots);

// 2. ELIMINAR líneas 59-61:
// React.useEffect(() => {
//   setSelectedSlotIds(selectedSlots);
// }, [selectedSlots]);

// 3. MODIFICAR handleSlotClick (eliminar línea 231):
const handleSlotClick = (slotId: string, date: Date, time: string) => {
  // ... validación existente ...
  
  // ELIMINAR: setSelectedSlotIds(consecutiveSlotIds);
  
  // MANTENER: Solo notificar al padre
  onSlotSelect(consecutiveSlotIds, slot.date, slot.time, totalDurationReserved);
  // ... logs y toast existentes ...
};

// 4. MODIFICAR goToPreviousWeek (líneas 250-257):
const goToPreviousWeek = () => {
  if (currentWeek > 0) {
    setCurrentWeek(prev => prev - 1);
    // ELIMINAR: setSelectedSlotIds([]);
    onSlotSelect([], new Date(), '', 0); // Padre limpia la selección
  }
};

// 5. MODIFICAR goToNextWeek (líneas 259-264):
const goToNextWeek = () => {
  setCurrentWeek(prev => prev + 1);
  // ELIMINAR: setSelectedSlotIds([]);
  onSlotSelect([], new Date(), '', 0); // Padre limpia la selección
};

// 6. MODIFICAR SlotCard (línea 512):
<SlotCard
  // ...otros props...
  isSelected={selectedSlots.includes(slot.id)}  // Usar prop, no estado local
  // ...
/>
```

### Validación Post-Implementación

1. **Probar en móvil con "Dani Nail Artist"**: Seleccionar servicios de 30, 60 y 120 minutos
2. **Verificar que los slots permanecen seleccionados** después del toque
3. **Confirmar que el botón "Siguiente" aparece** inmediatamente
4. **Probar cambio de semana**: Verificar que la selección se limpia correctamente
5. **Comparar comportamiento** con otros anuncios (60-min slots) para confirmar consistencia
