

## Plan: Ajustes a la Vista Móvil de Servicios

### Resumen de Cambios

Se realizarán 3 ajustes específicos a la vista móvil recientemente implementada:

1. **Reducir tamaño de sección "Ubicación"**: Prevenir que el texto de "Cuidado Personal" se superponga
2. **Corregir redirección de servicios recomendados**: Asegurar que el click navegue a la página del anuncio
3. **Agregar fallback de imagen para Tutorías**: Usar el ícono de tutorías cuando no hay `gallery_images`

---

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/client/LocationHeader.tsx` | Reducir espaciado y tamaño visual |
| `src/components/client/RecommendedServiceCard.tsx` | Agregar fallback de imagen basado en `service_type.name` |

---

### Cambio 1: Reducir Tamaño de Sección "Ubicación"

**Archivo**: `src/components/client/LocationHeader.tsx`

**Problema**: El espaciado actual (`space-y-1`) y el texto "Ubicación" ocupan demasiado espacio vertical, causando que el texto "Cuidado Personal" se corte o superponga con otros elementos.

**Solución**: Reducir el espaciado vertical y compactar el diseño:

```typescript
// ANTES (línea 21-32):
return (
  <div className="space-y-1">
    <span className="text-xs text-muted-foreground uppercase tracking-wide">
      Ubicación
    </span>
    <div className="flex items-center gap-2">
      ...
    </div>
  </div>
);

// DESPUÉS:
return (
  <div className="space-y-0.5">
    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
      Ubicación
    </span>
    <div className="flex items-center gap-1.5">
      <MapPin className="h-3.5 w-3.5 text-primary" />
      <span className="text-sm font-medium text-foreground">
        {condominiumName}
      </span>
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  </div>
);
```

**Cambios específicos**:
- `space-y-1` → `space-y-0.5` (reducir espacio entre label y contenido)
- `text-xs` → `text-[10px]` (label más pequeño)
- `gap-2` → `gap-1.5` (menos espacio entre elementos)
- Íconos de `h-4 w-4` → `h-3.5 w-3.5` (ligeramente más pequeños)

---

### Cambio 2: Verificar Redirección de Servicios Recomendados

**Archivo**: `src/components/client/RecommendedServiceCard.tsx`

**Estado actual**: El componente ya tiene implementado correctamente el `handleClick` con navegación:
```typescript
const handleClick = () => {
  navigate(`/client/services/${listing.id}`);
};
```

Y el `onClick` está correctamente aplicado:
```tsx
<div 
  className={cn("flex-shrink-0 w-[150px] cursor-pointer group", className)}
  onClick={handleClick}
>
```

**Problema potencial**: Podría haber un problema de propagación de eventos o estilos. Se verificará que el contenedor tenga los estilos correctos para recibir clicks.

**Verificación**: Asegurar que el elemento clickeable no tenga `pointer-events-none` y que no haya elementos superpuestos que intercepten el click.

---

### Cambio 3: Agregar Fallback de Imagen para Tutorías

**Archivo**: `src/components/client/RecommendedServiceCard.tsx`

**Problema**: El listing de "Clases tutorías" no tiene `gallery_images`, por lo que muestra `/placeholder.svg` que aparece en blanco.

**Solución**: Agregar lógica de fallback que use los íconos de `serviceImages.ts` basándose en el `service_type.name`:

```typescript
// ANTES (línea 15-16):
const imageUrl = listing.gallery_images?.[0] || '/placeholder.svg';

// DESPUÉS:
import { 
  homeServiceImages, 
  classesServiceImages, 
  personalCareServiceImages,
  sportsServiceImages,
  petsServiceImages,
  otherServiceImages 
} from '@/constants/serviceImages';

// Helper para obtener imagen de fallback según service_type.name
const getServiceTypeImage = (serviceTypeName: string): string | null => {
  const name = serviceTypeName.toLowerCase();
  
  // Buscar en todos los mapas de imágenes de servicio
  const allServiceImages = {
    ...homeServiceImages,
    ...classesServiceImages,
    ...personalCareServiceImages,
    ...sportsServiceImages,
    ...petsServiceImages,
    ...otherServiceImages,
  };
  
  // Buscar coincidencia exacta primero
  if (allServiceImages[name]) {
    return allServiceImages[name];
  }
  
  // Buscar coincidencia parcial
  for (const [key, value] of Object.entries(allServiceImages)) {
    if (name.includes(key) || key.includes(name)) {
      return value;
    }
  }
  
  return null;
};

// En el componente:
const fallbackImage = listing.service_type?.name 
  ? getServiceTypeImage(listing.service_type.name) 
  : null;
  
const imageUrl = listing.gallery_images?.[0] || fallbackImage || '/placeholder.svg';
```

**Resultado esperado**:
- "Clases tutorías" → usará `/lovable-uploads/3176c881-803d-48d8-a644-0571866d8f46.png` (ícono de tutorías)
- Chef → usará la imagen de gallery si existe, o el ícono de chef
- Manicurista → usará la imagen de gallery si existe, o el ícono de manicurista
- Flores → usará la imagen de gallery si existe, o el ícono de floristería

---

### Flujo de Fallback de Imágenes

```text
┌─────────────────────────────────────────────────────────────────┐
│                  Lógica de Selección de Imagen                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ¿Tiene gallery_images[0]?                                   │
│     └─ SÍ → Usar gallery_images[0]                              │
│     └─ NO → Continuar...                                        │
│                                                                 │
│  2. ¿Existe service_type.name?                                  │
│     └─ SÍ → Buscar en serviceImages por nombre                  │
│             ├─ Encontrado → Usar imagen del service type        │
│             └─ No encontrado → Continuar...                     │
│     └─ NO → Continuar...                                        │
│                                                                 │
│  3. Usar /placeholder.svg (último recurso)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Archivos Modificados (Resumen)

| Archivo | Líneas Modificadas | Cambio |
|---------|-------------------|--------|
| `LocationHeader.tsx` | 21-32 | Reducir espaciado y tamaño de elementos |
| `RecommendedServiceCard.tsx` | 1-5, 15-16 | Agregar imports y lógica de fallback |

---

### Sección Técnica

#### LocationHeader.tsx - Código Final

```typescript
return (
  <div className="space-y-0.5">
    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
      Ubicación
    </span>
    <div className="flex items-center gap-1.5">
      <MapPin className="h-3.5 w-3.5 text-primary" />
      <span className="text-sm font-medium text-foreground">
        {condominiumName}
      </span>
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  </div>
);
```

#### RecommendedServiceCard.tsx - Nuevo Helper

```typescript
// Helper function to get fallback image from service type name
const getServiceTypeFallbackImage = (serviceTypeName: string | undefined): string | null => {
  if (!serviceTypeName) return null;
  
  const name = serviceTypeName.toLowerCase();
  
  const allServiceImages: Record<string, string> = {
    ...homeServiceImages,
    ...classesServiceImages,
    ...personalCareServiceImages,
    ...sportsServiceImages,
    ...petsServiceImages,
    ...otherServiceImages,
  };
  
  // Exact match
  if (allServiceImages[name]) return allServiceImages[name];
  
  // Partial match
  for (const [key, value] of Object.entries(allServiceImages)) {
    if (name.includes(key) || key.includes(name)) {
      return value;
    }
  }
  
  return null;
};
```

---

### Resultado Visual Esperado

Después de los cambios:

1. **Sección Ubicación**: Más compacta, sin superposición con "Cuidado Personal"
2. **Cards de Servicios Recomendados**: Clickeables y navegarán correctamente a `/client/services/{id}`
3. **"Clases tutorías"**: Mostrará el ícono de tutorías (libro con graduación) en lugar de imagen en blanco

