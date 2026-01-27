

## Rediseño de Barras de Progreso en Sección "Logros"

Se rediseñará la sección de Logros para proveedores, reemplazando las barras de progreso lineales actuales con un indicador circular tipo gauge para el nivel actual, y cards simplificadas para los niveles restantes.

---

### Análisis de la imagen de referencia

**Card del Nivel Actual (destacado):**
- Icono del nivel + nombre "Nuevo"
- Badge "Nivel Actual" naranja a la derecha
- Descripción del nivel debajo
- **Indicador semicircular (gauge)** con:
  - Arco de progreso naranja sobre fondo gris
  - Porcentaje centrado grande (41%)
  - Texto "12/29 Trabajos" debajo del porcentaje

**Cards de otros niveles (simplificadas):**
- Lista vertical de cards compactas
- Cada card tiene: icono + nombre a la izquierda, rango de trabajos a la derecha
- Estilo minimalista con borde sutil

---

### Cambios a implementar

#### 1. Nuevo componente: `src/components/achievements/SemiCircularProgress.tsx`

Componente SVG para el indicador semicircular:
- Arco de fondo gris claro (180 grados)
- Arco de progreso naranja proporcional al porcentaje
- Espacio central para mostrar texto

```text
        ____...____
      /             \
     /               \
    |                 |
     \               /
      \             /
        ‾‾‾‾‾‾‾‾‾‾‾
          41%
      12/29 Trabajos
```

**Props:**
- `value`: número de 0-100 (porcentaje de progreso)
- `color`: color del arco de progreso
- `size`: tamaño del componente (por defecto 180px)

---

#### 2. Modificar: `src/components/achievements/LevelCard.tsx`

**Nueva lógica de renderizado:**

Si `isCurrentLevel === true`:
- Card grande destacada con borde
- Header: icono + nombre + badge "Nivel Actual"
- Descripción del nivel
- SemiCircularProgress con:
  - Valor = progreso dentro del nivel
  - Texto central = porcentaje
  - Texto inferior = "X/Y Trabajos"

Si `isCurrentLevel === false`:
- Card compacta en una sola fila
- Icono + nombre a la izquierda
- Rango de trabajos a la derecha
- Sin barra de progreso

---

#### 3. Modificar: `src/pages/Achievements.tsx`

**Cambios en layout:**

1. Eliminar la Card de resumen superior (ya que el nivel actual tendrá prominencia)
2. Renderizar primero el nivel actual como card grande
3. Renderizar los demás niveles como lista de cards compactas
4. Mantener el componente RatingHistory al final

**Nueva estructura:**

```text
+------------------------------------------+
|  Logros                                  |
+------------------------------------------+
|                                          |
|  ┌────────────────────────────────────┐  |
|  │  🏅 Nuevo           [Nivel Actual] │  |
|  │  Proveedor recién registrado...    │  |
|  │                                    │  |
|  │         ____...____                │  |
|  │       /     🟠     \               │  |
|  │      /               \             │  |
|  │                                    │  |
|  │           41%                      │  |
|  │       12/29 Trabajos               │  |
|  └────────────────────────────────────┘  |
|                                          |
|  ┌────────────────────────────────────┐  |
|  │  🥉 Bronce          30 - 99 trabajos │  |
|  └────────────────────────────────────┘  |
|  ┌────────────────────────────────────┐  |
|  │  ⭐ Plata          100 - 499 trabajos│  |
|  └────────────────────────────────────┘  |
|  ┌────────────────────────────────────┐  |
|  │  🏆 Oro            500 - 999 trabajos│  |
|  └────────────────────────────────────┘  |
|  ┌────────────────────────────────────┐  |
|  │  👑 Platino      1000 - 2499 trabajos│  |
|  └────────────────────────────────────┘  |
|  ┌────────────────────────────────────┐  |
|  │  💎 Diamante        2500+ trabajos   │  |
|  └────────────────────────────────────┘  |
|                                          |
+------------------------------------------+
```

---

### Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `src/components/achievements/SemiCircularProgress.tsx` | **Crear** - Componente SVG de gauge semicircular |
| `src/components/achievements/LevelCard.tsx` | **Modificar** - Rediseñar para card actual vs. compacta |
| `src/pages/Achievements.tsx` | **Modificar** - Ajustar layout para nuevo diseño |

---

### Detalles técnicos

**SemiCircularProgress SVG:**
- Radio externo: 80-90px
- Grosor del arco: 12-15px
- Ángulo inicio: 180° (izquierda)
- Ángulo fin: 0° (derecha)
- Fórmula: `strokeDasharray` y `strokeDashoffset` para el progreso

**Colores:**
- Arco de fondo: `#E5E7EB` (gris claro)
- Arco de progreso: Color primario o color del nivel (`#F97316` naranja)
- Texto porcentaje: Negro/gris oscuro, font-bold
- Texto trabajos: Gris medio, texto pequeño

**Responsive:**
- Gauge más pequeño en móvil (140px vs 180px)
- Cards compactas mantienen diseño horizontal

---

### Iconos por nivel

Se mantienen los iconos existentes del `iconMap`:
- Nuevo: Award (🏅)
- Bronce: Award (🥉)
- Plata: Star (⭐)
- Oro: Trophy (🏆)
- Platino: Crown (👑)
- Diamante: Gem (💎)

Los colores serán el tono naranja/terracota de la imagen de referencia para el nivel actual.

