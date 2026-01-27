

## Rediseño de "Config. Disponibilidad" con Dos Tabs

Se rediseñará el componente `AvailabilityManager` para que coincida exactamente con las imágenes de referencia proporcionadas, manteniendo coherencia visual con otras secciones y garantizando un funcionamiento confiable.

---

### Análisis de las imágenes de referencia

**Tab "Configurar" (imagen izquierda):**
- Título "Administrar Disponibilidad" centrado
- Tabs pill-shaped con "Configurar" activo (naranja) y "Administrar" inactivo (gris)
- Cards por día con:
  - Nombre del día (ej. "Lunes") 
  - Switch "Disponible" alineado a la derecha
  - Campos "Hora de inicio" y "Hora de finalización" en formato 12h AM/PM
  - Botón "+ Agregar Horario Adicional" en la parte inferior de cada card
- Botón "Guardar" grande color primario al final

**Tab "Administrar" (imagen derecha):**
- Mismo header con tabs
- "Semana actual" con rango de fechas y navegación (flechas < >)
- Leyenda de colores: Disponibles (verde), Bloqueados (naranja/rojo), Recurrentes (amarillo)
- Cards por día mostrando grilla de slots:
  - Nombre del día y fecha
  - Grid 4 columnas con horarios en formato 12h AM
  - Colores: verde = disponible, rojo/naranja = bloqueado, amarillo = recurrente
- Botón "Guardar" al final

---

### Cambios a implementar

#### 1. `src/components/calendar/AvailabilityManager.tsx` - Rediseño completo

**Estructura nueva:**

```text
+------------------------------------------+
|    Administrar Disponibilidad            |
|------------------------------------------|
|  [Configurar]  |  Administrar            |  <- Tabs pill-shaped
+------------------------------------------+
|                                          |
|  [Contenido del tab activo]              |
|                                          |
+------------------------------------------+
|          [   Guardar   ]                 |  <- Botón fijo al final
+------------------------------------------+
```

**Cambios específicos:**

1. **Header unificado**: 
   - Título "Administrar Disponibilidad" centrado grande
   - Tabs como segmented control con estilo pill naranja/gris

2. **Tab "Configurar"**:
   - Cards de día con diseño más limpio
   - Switch "Disponible" en la esquina derecha del header
   - Inputs de hora con formato 12h (ej. "07:00 AM")
   - Botón "+ Agregar Horario Adicional" dentro de cada card expandida

3. **Tab "Administrar"**:
   - Header con "Semana actual" y navegación
   - Leyenda de colores horizontal
   - Cards por día con grid de slots 4 columnas
   - Colores: verde (disponible), naranja/rojo (bloqueado), amarillo (recurrente)

4. **Botón "Guardar"**: 
   - Siempre visible, fijo en la parte inferior
   - Estilo primario (naranja) full-width

---

#### 2. Cambios en estilos y UX

**Colores de slots:**
- Verde (`bg-emerald-100`) → Disponible
- Rojo/Naranja (`bg-red-100` o `bg-orange-100`) → Bloqueado manualmente
- Amarillo (`bg-amber-100`) → Bloqueado por cita recurrente

**Formato de hora:**
- Cambiar de formato 24h a 12h con AM/PM
- Usar helper `formatTo12Hour` existente

**Layout:**
- Contenedor scrolleable para el contenido
- Botón guardar sticky al fondo

---

#### 3. Verificación de coherencia con otras secciones

**Con sección "Clientes":**
- Mismos estilos de Card, Badge, y Button
- Consistencia en espaciado y tipografía

**Con citas activas y recurrentes:**
- Los slots recurrentes deben reflejar exactamente las citas recurrentes activas
- Sincronización bidireccional con `recurring_rules` y `recurring_appointment_instances`
- Validación cruzada con `appointments` table

---

### Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `src/components/calendar/AvailabilityManager.tsx` | Rediseño completo según mockups |
| `src/components/calendar/ProviderSlotBlockingGrid.tsx` | Ajustar colores y leyenda |

---

### Flujo de datos garantizado

```text
1. Usuario configura disponibilidad (Tab "Configurar")
   ↓
2. Guardar → provider_availability table
   ↓
3. Sync automático → listings.availability
   ↓
4. RPC sync_slots_with_availability → provider_time_slots
   ↓
5. Tab "Administrar" muestra slots generados
   ↓
6. Slots recurrentes vienen de recurring_appointment_instances
```

---

### Validaciones de confiabilidad

1. **Antes de guardar**: Validar que horarios no se superpongan
2. **Después de guardar**: Confirmar que slots se regeneraron correctamente
3. **Tab Administrar**: Mostrar indicador de sincronización si hay cambios pendientes
4. **Real-time**: Suscripción a cambios en `provider_time_slots` para actualizaciones automáticas

---

### Detalles técnicos para el desarrollador

**Formato de hora 12h:**
Se usará la función `formatTo12Hour` de `src/lib/utils.ts` para mostrar "07:00 AM" en lugar de "07:00".

**Inputs de hora:**
Los inputs HTML `type="time"` permanecen en formato 24h internamente, pero se mostrará el valor formateado al usuario usando labels.

**Sincronización de slots:**
- El hook `useProviderSlotManagement` ya obtiene slots correctamente
- El hook `useProviderAvailability` ya sincroniza con `sync_slots_with_availability` RPC
- Solo se necesita ajustar la UI para coincidir con el diseño

**Colores consistentes:**
- Disponible: `bg-emerald-100 text-emerald-800`
- Bloqueado: `bg-red-100 text-red-800` o `bg-orange-100 text-orange-800`
- Recurrente: `bg-amber-100 text-amber-800`

