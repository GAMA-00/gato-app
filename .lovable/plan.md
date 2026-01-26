
## Plan: Rediseño de Vista Móvil - ClientServices y ClientCategoryDetails

### Objetivo
Rediseñar la vista móvil de la pantalla de categorías (`ClientServices.tsx`) y la vista de detalle de categoría (`ClientCategoryDetails.tsx`) para que coincidan con los diseños de referencia proporcionados, manteniendo los iconos actuales y una apariencia limpia, minimalista y ordenada.

### Cambios Visuales Principales

#### 1. Nueva Estructura de ClientServices (Vista Móvil)

```text
┌──────────────────────────────────────────────┐
│ [Logo]                              [Menu ☰] │  ← Header existente
├──────────────────────────────────────────────┤
│                                              │
│  Ubicación                                   │  ← NUEVO: Sección de ubicación
│  📍 Condominio El Álamo ▼                    │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  Categorías                                  │  ← Título de sección
│                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │  🏠     │ │  🐱     │ │  📚     │        │
│  │ Hogar   │ │Mascotas │ │ Clases  │        │
│  └─────────┘ └─────────┘ └─────────┘        │
│                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │  💇     │ │  🏋️     │ │  🌍     │        │
│  │Cuidado  │ │Deportes │ │ Otros   │        │
│  │Personal │ │         │ │         │        │
│  └─────────┘ └─────────┘ └─────────┘        │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  Servicios recomendados                      │  ← NUEVO: Scroll horizontal
│                                              │
│  ← [Chef] [Manicurista] [Tutorías] [Flores] →│
│                                              │
├──────────────────────────────────────────────┤
│  [Servicios] [Reservas] [Facturas] [Perfil]  │  ← Bottom nav existente
└──────────────────────────────────────────────┘
```

#### 2. Nueva Estructura de ClientCategoryDetails (Vista Móvil)

```text
┌──────────────────────────────────────────────┐
│ [←]                                    [⊕]   │  ← Header con back button
├──────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐   │
│ │         HERO SECTION                   │   │  ← NUEVO: Hero con gradient
│ │                                        │   │
│ │  Hogar                      🏠         │   │  ← Nombre + Icono de categoría
│ │                                        │   │
│ │  [Hogar] [Mascotas] [Clases] [...]    │   │  ← Pills/chips de categorías
│ │                                        │   │
│ └────────────────────────────────────────┘   │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────┐  ┌──────────────┐         │  ← Grid de listings
│  │   [Imagen]   │  │   [Imagen]   │         │
│  │ Nombre Prov. │  │ Nombre Prov. │         │
│  │ Servicio ⭐  │  │ Servicio ⭐  │         │
│  └──────────────┘  └──────────────┘         │
│                                              │
│  ┌──────────────┐  ┌──────────────┐         │
│  │   [Imagen]   │  │   [Imagen]   │         │
│  │ ...          │  │ ...          │         │
│  └──────────────┘  └──────────────┘         │
│                                              │
├──────────────────────────────────────────────┤
│  [Servicios] [Reservas] [Facturas] [Perfil]  │
└──────────────────────────────────────────────┘
```

---

### Archivos a Crear/Modificar

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `src/components/client/LocationHeader.tsx` | CREAR | Componente para mostrar "Ubicación" + Condominio del usuario |
| `src/components/client/RecommendedServicesCarousel.tsx` | CREAR | Carrusel horizontal de servicios recomendados |
| `src/components/client/RecommendedServiceCard.tsx` | CREAR | Tarjeta compacta para cada servicio recomendado |
| `src/components/client/CategoryHeroHeader.tsx` | CREAR | Hero header con gradient y pill navigation para categorías |
| `src/components/client/CategoryPillNav.tsx` | CREAR | Pills horizontales para navegar entre categorías |
| `src/components/client/CategoryListingCard.tsx` | CREAR | Tarjeta de listing estilo mockup (imagen + nombre + rating) |
| `src/hooks/useRecommendedListings.ts` | CREAR | Hook para obtener listings de Chef, Manicurista, Tutorías, Flores |
| `src/constants/categoryColors.ts` | CREAR | Colores de gradient por categoría para el hero |
| `src/pages/ClientServices.tsx` | MODIFICAR | Reorganizar layout con nuevo orden de secciones |
| `src/pages/ClientCategoryDetails.tsx` | MODIFICAR | Agregar hero header y cambiar grid de cards |

---

### Sección Técnica

#### 1. LocationHeader.tsx
```typescript
// Muestra la ubicación del usuario
// Usa useUserProfile() para obtener condominium_text
// Renderiza: "Ubicación" + icono ubicación + nombre del condominio + dropdown chevron
```

#### 2. RecommendedServicesCarousel.tsx
```typescript
// Props: listings: RecommendedListing[]
// Renderiza un contenedor con overflow-x-auto y scroll horizontal
// Muestra RecommendedServiceCard para cada listing
// Servicios fijos: Chef, Manicurista, Tutorías, Flores
```

#### 3. useRecommendedListings.ts
```typescript
// Query a Supabase para obtener listings activos donde:
// service_type.name ILIKE '%chef%' OR '%manicur%' OR '%tutor%' OR '%flor%'
// Retorna: { listings, isLoading }
```

#### 4. CategoryHeroHeader.tsx
```typescript
// Props: categoryId, categoryLabel
// Renderiza:
// - Fondo con gradient según categoryColors[categoryId]
// - Título de categoría (texto grande, blanco)
// - Icono de categoría (CategoryIcon actual, posición derecha)
// - CategoryPillNav con todas las categorías
```

#### 5. CategoryPillNav.tsx
```typescript
// Props: currentCategory, categories[]
// Renderiza pills horizontales con scroll
// La categoría actual está resaltada (fondo naranja, texto blanco)
// Las demás tienen fondo gris claro
// onClick navega a /client/category/{categoryName}
```

#### 6. CategoryListingCard.tsx
```typescript
// Props: listing (con imagen, provider name, rating)
// Diseño según mockup:
// - Imagen cuadrada con bordes redondeados
// - Nombre del proveedor debajo
// - Nombre del servicio + rating (estrella amarilla)
// - Corazón de favorito (opcional, esquina superior derecha)
```

#### 7. Colores de Gradient por Categoría
```typescript
// categoryColors.ts
export const categoryGradients: Record<string, string> = {
  'home': 'from-[#F5EDE8] to-[#E8DED6]',       // Beige suave (casita)
  'pets': 'from-[#FFCCC5] to-[#FFB4AA]',       // Coral/salmon (gatito)
  'classes': 'from-[#FFE4C4] to-[#FFD4A8]',    // Naranja claro (libros)
  'personal-care': 'from-[#D4E5F7] to-[#C4D9EF]', // Azul claro (secadora)
  'sports': 'from-[#E5E5E5] to-[#D5D5D5]',     // Gris (pesas)
  'other': 'from-[#E8F4EC] to-[#D8E8DF]',      // Verde claro (mundo)
};
```

---

### Cambios en ClientServices.tsx

```typescript
// ESTRUCTURA ACTUAL:
// - ClientPageLayout con title
// - Grid de 6 categorías

// ESTRUCTURA NUEVA (solo mobile):
return (
  <ClientPageLayout>
    {isMobile ? (
      <div className="space-y-6">
        {/* 1. Ubicación */}
        <LocationHeader />
        
        {/* 2. Categorías */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Categorías</h2>
          <div className="grid grid-cols-3 gap-3">
            {/* Mismo grid actual pero 3 columnas en mobile */}
          </div>
        </section>
        
        {/* 3. Servicios recomendados */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Servicios recomendados</h2>
          <RecommendedServicesCarousel listings={recommendedListings} />
        </section>
      </div>
    ) : (
      // Desktop: mantener layout actual
    )}
  </ClientPageLayout>
);
```

---

### Cambios en ClientCategoryDetails.tsx

```typescript
// ESTRUCTURA ACTUAL:
// - ClientPageLayout
// - h1 centrado con categoryLabel
// - Grid de ServiceTypeCard

// ESTRUCTURA NUEVA:
return (
  <>
    <Navbar />
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Hero Header con gradient */}
      <CategoryHeroHeader
        categoryId={categoryId}
        categoryLabel={categoryLabel}
        allCategories={allCategories}
      />
      
      {/* Listings Grid */}
      <div className="p-4 pt-2 pb-20">
        <div className="grid grid-cols-2 gap-4">
          {listings.map(listing => (
            <CategoryListingCard
              key={listing.id}
              listing={listing}
              onClick={() => navigate(`/client/services/${listing.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  </>
);
```

---

### Diseño de RecommendedServiceCard

```text
┌────────────────────┐
│                    │
│   [Imagen grande   │  ← aspect-[4/3] o similar
│    del servicio]   │
│                    │
├────────────────────┤
│ Nombre Proveedor   │  ← text-xs, muted
│ Servicio Name      │  ← text-sm, font-semibold
│ ⭐ 5.0             │  ← rating con estrella amarilla
└────────────────────┘
```
Tamaño: ~150px de ancho para mostrar 2 inicialmente y que se vea que hay más al hacer scroll.

---

### Diseño de CategoryListingCard (dentro de categoría)

Similar al mockup:
```text
┌────────────────────┐
│                  ♡ │  ← Corazón opcional
│   [Imagen del     │
│    servicio]      │
│                    │
├────────────────────┤
│ Nombre Proveedor   │
│ Servicio  ⭐ 5.0   │
└────────────────────┘
```

---

### Responsividad

| Breakpoint | ClientServices | ClientCategoryDetails |
|------------|----------------|----------------------|
| Mobile (<768px) | Layout nuevo con ubicación + categorías 3 cols + carrusel | Hero header + grid 2 cols |
| Tablet (768-1024px) | Layout existente | Layout existente |
| Desktop (>1024px) | Layout existente | Layout existente |

---

### Consideraciones

1. **Iconos**: Se mantienen los iconos actuales de `CategoryIcon.tsx` (imágenes PNG customizadas)
2. **Colores**: Los gradients del hero header son suaves y combinan con los iconos
3. **Navegación**: Las pills en el hero header permiten cambiar de categoría sin volver atrás
4. **Performance**: El carrusel usa lazy loading para las imágenes
5. **Accesibilidad**: Todos los elementos clickeables tienen roles y labels apropiados

---

### Orden de Implementación

1. Crear `categoryColors.ts` con gradients
2. Crear `LocationHeader.tsx`
3. Crear `useRecommendedListings.ts`
4. Crear `RecommendedServiceCard.tsx`
5. Crear `RecommendedServicesCarousel.tsx`
6. Modificar `ClientServices.tsx` para nuevo layout mobile
7. Crear `CategoryPillNav.tsx`
8. Crear `CategoryHeroHeader.tsx`
9. Crear `CategoryListingCard.tsx`
10. Modificar `ClientCategoryDetails.tsx` para nuevo layout
