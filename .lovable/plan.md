

## Actualizar iconos y redisenar tarjetas de categorias

### Que se hara

Reemplazar los iconos actuales de las 6 categorias con los nuevos PNGs proporcionados y redisenar las tarjetas para que coincidan con el mockup de referencia: texto en esquina superior izquierda, icono grande en esquina inferior derecha parcialmente recortado, fondos de color por categoria, sombras suaves.

### Archivos de iconos a copiar

| Categoria | Archivo subido | Destino |
|-----------|---------------|---------|
| Hogar | iconos-06.png | src/assets/category-home.png |
| Mascotas | iconos-07.png | src/assets/category-pets.png |
| Clases | iconos-08.png | src/assets/category-classes.png |
| Cuidado Personal | iconos-09.png | src/assets/category-personal-care.png |
| Deportes | iconos-10.png | src/assets/category-sports.png |
| Otros | iconos-11.png | src/assets/category-other.png |

### Cambios por archivo

**1. `src/constants/categoryConstants.ts`**

Reemplazar `categoryImageUrls` para usar imports desde `src/assets/` en lugar de rutas `/lovable-uploads/`. Exportar un mapa de imports.

**2. `src/constants/categoryColors.ts`**

Agregar colores de fondo solidos para las tarjetas de la pagina principal (no gradientes, sino colores planos que coincidan con la referencia):
- Hogar: `#F5EDE8` (beige)
- Mascotas: `#FFCCC5` (coral)
- Clases: `#FFE4C4` (naranja claro)
- Cuidado Personal: `#D4E5F7` (azul claro)
- Deportes: `#E5E5E5` (gris)
- Otros: `#E8F4EC` (verde claro)

**3. `src/components/client/CategoryIcon.tsx`**

Simplificar para usar los imports directos de assets. Eliminar logica de fallback a Lucide icons ya que ahora todos los iconos son imagenes.

**4. `src/pages/ClientServices.tsx`**

Redisenar la estructura de las tarjetas de categoria (mobile y desktop):
- Card con `overflow-hidden` y `relative`
- Fondo de color por categoria (no gris uniforme)
- Texto (`categoryLabel`) posicionado arriba-izquierda, font bold, color oscuro
- Icono posicionado abajo-derecha, tamano grande, parcialmente recortado (translate para que sobresalga)
- Sombra suave, bordes redondeados

**5. `src/components/client/CategoryHeroHeader.tsx`**

Actualizar para usar los nuevos iconos (ya usa `CategoryIcon`, solo verificar que se vea bien con las nuevas imagenes).

### Layout de tarjeta (mobile)

```text
+------------------+
| Hogar            |  <- texto top-left, bold
|                  |
|            🏠    |  <- icono bottom-right, ~60% del tamano de la card
|          (crop)  |     parcialmente fuera del borde
+------------------+
```

### Lugares donde se muestran categorias

1. `ClientServices.tsx` - grid principal (mobile 3 cols, desktop 2-3 cols)
2. `CategoryHeroHeader.tsx` - header de detalle de categoria
3. `CategoryPillNav` - pills de navegacion (solo texto, no afectado)

