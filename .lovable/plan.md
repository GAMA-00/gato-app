

## Rediseño del Dashboard de Proveedores con Tabs y Notificaciones

Se modificará la página de inicio de proveedores para implementar un diseño con dos tabs ("Citas" y "Solicitudes"), cada uno con scroll independiente y notificaciones tipo globo, siguiendo las imágenes de referencia proporcionadas.

---

### Resumen de Cambios

| Componente | Cambio |
|------------|--------|
| `src/components/dashboard/DashboardContent.tsx` | Agregar sistema de tabs con contenido scrolleable independiente |
| `src/components/dashboard/ProviderDashboardHeader.tsx` | Nuevo componente para header con logo y saludo |
| `src/components/dashboard/ProviderStatsCards.tsx` | Nuevo componente para tarjetas de estadísticas horizontales |
| `src/components/dashboard/ProviderDashboardTabs.tsx` | Nuevo componente para tabs con notificaciones tipo globo |
| `src/pages/Dashboard.tsx` | Pasar datos de pending requests al DashboardContent |

---

### Diseño Visual (Referencia)

**Estructura de la página:**

```text
┌──────────────────────────────────────┐
│  [Logo gato]                         │
│  Proveedor                           │
├──────────────────────────────────────┤
│  Bienvenida, [Nombre Proveedor]      │
├──────────────────────────────────────┤
│ ┌──────────┬──────────┬────────────┐ │
│ │ Esta     │ Clientes │  Ingresos  │ │
│ │ semana   │recurrente│            │ │
│ │    12    │     2    │    $12     │ │
│ │Próx.citas│  Activos │  Este mes  │ │
│ └──────────┴──────────┴────────────┘ │
├──────────────────────────────────────┤
│ ┌─────────────┬─────────────────────┐│
│ │   Citas (3) │   Solicitudes (2)   ││
│ └─────────────┴─────────────────────┘│
├──────────────────────────────────────┤
│ (Contenido scrolleable del tab)      │
│                                      │
│ - Citas de Hoy                       │
│ - Citas de Mañana                    │
│                                      │
└──────────────────────────────────────┘
```

---

### 1. Nuevo Componente: `ProviderDashboardHeader.tsx`

Crear header con logo "gato" y etiqueta "Proveedor", más saludo personalizado.

**Ubicación:** `src/components/dashboard/ProviderDashboardHeader.tsx`

```tsx
// Estructura del componente:
// - Logo de Gato con texto "Proveedor" debajo
// - Título: "Bienvenida, [Nombre]"
// - Usa el logo existente: /lovable-uploads/d68195ea-57ea-4225-995d-8857c18be160.png
```

**Elementos visuales:**
- Logo grande centrado o alineado a la izquierda
- Texto "Proveedor" en color gris debajo del logo
- Saludo con nombre del usuario en tipografía grande

---

### 2. Nuevo Componente: `ProviderStatsCards.tsx`

Reemplazar las tarjetas de estadísticas actuales con el diseño horizontal de las imágenes de referencia.

**Ubicación:** `src/components/dashboard/ProviderStatsCards.tsx`

**Diseño de cada tarjeta:**
- Fondo `bg-muted/40` o similar claro
- Icono pequeño en la parte superior
- Etiqueta descriptiva (ej: "Esta semana")
- Valor grande y bold
- Subtítulo descriptivo (ej: "Próximas citas")

**Estadísticas a mostrar:**
1. **Esta semana** - Número de próximas citas
2. **Clientes recurrentes** - Clientes activos
3. **Ingresos** - Ingresos del mes

---

### 3. Nuevo Componente: `ProviderDashboardTabs.tsx`

Sistema de tabs con notificaciones tipo globo y scroll independiente.

**Ubicación:** `src/components/dashboard/ProviderDashboardTabs.tsx`

**Estructura:**
```tsx
<Tabs defaultValue="citas">
  <TabsList>
    <TabsTrigger value="citas">
      Citas
      {citasCount > 0 && <Badge>{citasCount}</Badge>}
    </TabsTrigger>
    <TabsTrigger value="solicitudes">
      Solicitudes
      {solicitudesCount > 0 && <Badge>{solicitudesCount}</Badge>}
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="citas" className="overflow-y-auto max-h-[calc(100vh-XXpx)]">
    {/* Citas de Hoy */}
    {/* Citas de Mañana */}
  </TabsContent>
  
  <TabsContent value="solicitudes" className="overflow-y-auto max-h-[calc(100vh-XXpx)]">
    {/* Lista de solicitudes pendientes */}
  </TabsContent>
</Tabs>
```

**Características clave:**
- Tabs estilizados con fondo naranja/primary cuando están activos
- Globos de notificación con conteo
- Cada TabsContent tiene su propio scroll independiente
- El contenido ocupa el espacio disponible de la pantalla

---

### 4. Modificar `DashboardContent.tsx`

Actualizar la sección de proveedores para usar los nuevos componentes.

**Cambios principales:**
- Importar `useGroupedPendingRequests` para obtener solicitudes pendientes
- Reemplazar estructura actual con:
  1. `ProviderDashboardHeader`
  2. `ProviderStatsCards`
  3. `ProviderDashboardTabs`

**Datos necesarios:**
- `activeAppointmentsToday` - Citas de hoy
- `tomorrowsAppointments` - Citas de mañana
- `groupedRequests` - Solicitudes pendientes (desde useGroupedPendingRequests)
- `stats` - Estadísticas para las tarjetas

---

### 5. Estilizado de los Tabs

**Tab inactivo:**
- Texto gris (`text-muted-foreground`)
- Sin fondo

**Tab activo:**
- Fondo naranja/primary con bordes redondeados completos (pill shape)
- Texto blanco
- `rounded-full` para forma de píldora

**Notificaciones (badges):**
- Círculo pequeño con número
- Posición: inline al lado del texto o como superíndice
- Color: azul claro o gris para contraste

---

### Sección Técnica

#### Archivos a crear:

1. **`src/components/dashboard/ProviderDashboardHeader.tsx`**
   - Props: `userName: string`
   - Renderiza logo + "Proveedor" + "Bienvenida, {nombre}"

2. **`src/components/dashboard/ProviderStatsCards.tsx`**
   - Props: `stats: DashboardStatsType, isLoading: boolean`
   - Grid horizontal de 3 tarjetas compactas

3. **`src/components/dashboard/ProviderDashboardTabs.tsx`**
   - Props: 
     - `activeAppointmentsToday: any[]`
     - `tomorrowsAppointments: any[]`
     - `pendingRequests: any[]`
   - Sistema de tabs con Radix UI
   - Scroll independiente por tab

#### Archivos a modificar:

1. **`src/components/dashboard/DashboardContent.tsx`**
   - Importar nuevos componentes
   - Importar `useGroupedPendingRequests` hook
   - Importar `useRequestActions` para manejar aceptar/rechazar
   - Actualizar renderContent() para proveedores

#### Dependencias utilizadas:
- `@radix-ui/react-tabs` (ya instalado)
- `lucide-react` para iconos
- Hooks existentes: `useGroupedPendingRequests`, `useRequestActions`

#### Estructura de scroll independiente:
```tsx
// Para cada TabsContent
className="overflow-y-auto"
style={{ maxHeight: 'calc(100vh - 380px)' }}  // Ajustar según altura del header + stats + tabs
```

#### Manejo de solicitudes:
- Reutilizar componentes existentes:
  - `RequestCard` de `src/components/calendar/RequestCard.tsx`
  - `RequestActions` para aceptar/rechazar
  - `useRequestActions` hook para lógica

---

### Resultado Esperado

**Móvil y Desktop:**
- Header con logo "gato" y texto "Proveedor"
- Saludo personalizado "Bienvenida, [Nombre]"
- Tres tarjetas de estadísticas en fila horizontal
- Tabs "Citas" y "Solicitudes" con badges de notificación
- Contenido de cada tab con scroll independiente
- Diseño consistente con las imágenes de referencia

**Tab "Citas":**
- Sección "Citas de Hoy" con conteo
- Sección "Citas de Mañana" con conteo
- Tarjetas de citas con información del cliente, servicio, hora y ubicación

**Tab "Solicitudes":**
- Título "Solicitudes de Reserva" con conteo
- Lista de RequestCards con acciones de aceptar/rechazar
- Mensaje vacío si no hay solicitudes pendientes

