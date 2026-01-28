
# Plan: Corregir Inconsistencia en la Etiqueta "Recomendado"

## Problema Identificado

La etiqueta "Recomendado" no aparece consistentemente en todos los slots adyacentes a citas agendadas. Tras investigar el código fuente, identifiqué **tres causas principales**:

### 1. Desajuste de Timezone en el Cálculo de Adyacencia
En `useWeeklySlotsFetcher.ts`, las citas se procesan con timestamps UTC mientras los slots usan hora local directa:

```typescript
// Línea 650-655 - Problema: getHours() devuelve hora local del navegador
const start = new Date(apt.start_time);  // UTC timestamp
const startMin = start.getHours() * 60 + start.getMinutes();  // Hora local del navegador
```

El `dateKey` de las citas se calcula con `format(start, 'yyyy-MM-dd')` que usa la zona horaria del navegador, mientras que los slots usan directamente `slot.slot_date` de la base de datos (hora local de Costa Rica).

### 2. Cálculo del Step Incompleto
El paso (`step`) entre slots se calcula buscando la diferencia mínima entre slots consecutivos. Sin embargo, cuando hay pocos slots disponibles en un día, el cálculo puede dar resultados incorrectos:

- Si solo hay 1 slot disponible, el step es 60 (fallback)
- Pero la duración real del slot podría ser diferente

### 3. Filtrado que Excluye Slots del Pool de Cálculo
Los slots pasan por múltiples filtros (`accommodatableSlots`, `filteredByNotice`) que reducen la lista de slots disponibles **antes** de calcular las recomendaciones. Esto puede hacer que slots adyacentes a citas no se marquen como recomendados porque fueron excluidos del pool de cálculo.

## Solución Propuesta

### Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useWeeklySlotsFetcher.ts` | Corregir lógica de adyacencia |

### Cambios Específicos

1. **Usar la duración real del slot en lugar del step calculado**
   - Cambiar `slotMin + step` por `slotMin + slotDuration` donde `slotDuration` se obtiene del slot actual
   - Esto garantiza que el cálculo de "este slot termina justo antes de la cita" sea correcto

2. **Normalizar la zona horaria al procesar citas**
   - Extraer hora/minutos de la cita usando la zona horaria de Costa Rica consistentemente
   - Usar `formatInTimeZone` de `date-fns-tz` para garantizar consistencia

3. **Calcular adyacencia basándose en la hora real de fin del slot**
   - En lugar de usar `slotMin + step`, calcular la hora de fin real del slot
   - Comparar: `slotEndMin === apptStartMin` (slot termina cuando cita inicia)
   - Comparar: `slotStartMin === apptEndMin` (slot inicia cuando cita termina)

## Detalles Técnicos

### Cambio en cálculo de minutos de citas (líneas ~648-661)

```typescript
// ANTES: Usa getHours() que depende del navegador
const start = new Date(apt.start_time);
const startMin = start.getHours() * 60 + start.getMinutes();

// DESPUÉS: Usar zona horaria consistente
import { formatInTimeZone } from 'date-fns-tz';
const start = new Date(apt.start_time);
const startTimeStr = formatInTimeZone(start, 'America/Costa_Rica', 'HH:mm');
const [startHH, startMM] = startTimeStr.split(':').map(Number);
const startMin = startHH * 60 + startMM;
```

### Cambio en cálculo de adyacencia (líneas ~772-774)

```typescript
// ANTES: Usa step que puede no coincidir con duración del slot
const isAdjacentBeforeAppointment = apptStarts.has(slotMin + step);

// DESPUÉS: Usar hora de fin real del slot
// Extraer hora de fin del slot de su propiedad time o calcular basado en duración estándar (60 min)
const slotEndMin = slotMin + 60;  // Los slots son de 60 minutos según memoria del proyecto
const isAdjacentBeforeAppointment = apptStarts.has(slotEndMin);
```

### Cambio para incluir dateKey consistente (líneas ~652-653)

```typescript
// ANTES: format() usa TZ del navegador
const startKey = format(start, 'yyyy-MM-dd');

// DESPUÉS: Usar TZ de Costa Rica
const startKey = formatInTimeZone(start, 'America/Costa_Rica', 'yyyy-MM-dd');
```

## Impacto

- **Slots adyacentes antes de citas**: Mostrarán correctamente "Recomendado"
- **Slots adyacentes después de citas**: Mostrarán correctamente "Recomendado"  
- **Consistencia entre anuncios**: Todos los servicios mostrarán recomendaciones de forma uniforme
- **Sin regresiones**: La lógica de bloqueo y disponibilidad no se modifica

## Pruebas Recomendadas

1. Verificar que el slot de 9:00 AM del 30 de enero en "Dani Nail Artist" muestre "Recomendado"
2. Confirmar que los slots de "Pet Grooming" sigan mostrando "Recomendado" correctamente
3. Probar con diferentes servicios para validar consistencia
