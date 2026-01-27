

## Rediseño del Calendario del Proveedor

Se eliminará el bloque "Solicitudes de Reserva" y se implementará un nuevo diseño de calendario con tema oscuro basado en la imagen de referencia, manteniendo el botón "Config. Disponibilidad".

---

### Cambios a realizar

#### 1. Archivo: `src/pages/Calendar.tsx`

**Eliminar:**
- Importación de `JobRequestsGrouped`
- El bloque JSX que renderiza `<JobRequestsGrouped />`

**Modificar:**
- Pasar la fecha seleccionada y las citas al nuevo componente de calendario

---

#### 2. Archivo: `src/components/calendar/CalendarView.tsx` (Rediseño completo)

**Nuevo diseño basado en la imagen de referencia:**

```text
+------------------------------------------+
|  Calendario                           +  |
|  Octubre                                 |
|------------------------------------------|
|  D    L    M    M    J    V    S         |
|                   1    2    3    4       |
|  5    6•   7•   8••  9    10•  11        |
|  12   13•  14•  15•• 16•  17   18•       |
|  19   20•  21   22   23•  24   [25]      |
|  26   27   28   29   30•  31             |
+------------------------------------------+
|                                          |
|  Lunes                                   |
|                                          |
|  8:00am  ┌──────────────────┐ Recurrente |
|          │ Lava car         │            |
|  9:00am  │ Carlos           │            |
|          └──────────────────┘            |
|  10:00am                                 |
|  11:00am                                 |
|  ...                                     |
+------------------------------------------+
```

**Estructura del componente:**
1. **Header con título**: "Calendario" + nombre del mes actual + botón "+"
2. **Grilla del mes (tema oscuro)**: 
   - Fondo oscuro (`bg-gray-900`)
   - Días de la semana (D, L, M, M, J, V, S)
   - Números de días seleccionables
   - Indicadores de puntos debajo de días con citas (verdes/naranjas)
   - Día actual resaltado con círculo naranja
3. **Panel inferior (tema claro)**:
   - Título del día seleccionado ("Lunes")
   - Lista de citas del día con horarios
   - Cada cita muestra: servicio, cliente, etiqueta "Recurrente" si aplica

---

#### 3. Componentes auxiliares a crear/modificar

**Nuevo: `src/components/calendar/MonthlyCalendarGrid.tsx`**
- Renderiza la grilla mensual con tema oscuro
- Props: `currentDate`, `selectedDate`, `appointments`, `onSelectDate`, `onNavigate`
- Cada día es un botón clickeable
- Muestra puntos indicadores debajo de días con citas:
  - Verde: citas confirmadas
  - Naranja: citas pendientes

**Nuevo: `src/components/calendar/DayAppointmentsList.tsx`**
- Muestra las citas del día seleccionado
- Diseño de línea de tiempo vertical con horarios
- Cada cita como tarjeta con borde izquierdo de color
- Etiqueta "Recurrente" si la cita es recurrente

---

### Flujo de interacción

1. Usuario ve el calendario mensual con tema oscuro
2. Los días con citas tienen puntos de colores
3. Al hacer clic en un día, se selecciona (círculo naranja)
4. El panel inferior muestra las citas de ese día
5. El botón "Config. Disponibilidad" permanece en la esquina superior derecha

---

### Detalles técnicos

**Estilos del calendario mensual:**
- Contenedor: `bg-gray-900 rounded-t-3xl`
- Días del encabezado: `text-gray-400 text-sm`
- Números de días: `text-white` (mes actual), `text-gray-500` (mes anterior/siguiente)
- Día seleccionado: `bg-orange-500 rounded-full`
- Indicadores: círculos pequeños (`w-1.5 h-1.5 rounded-full`)

**Estilos del panel de citas:**
- Contenedor: `bg-white rounded-t-3xl -mt-6 pt-6`
- Horarios: `text-gray-400 text-xs`
- Tarjetas de cita: borde izquierdo verde para confirmadas, naranja para pendientes

