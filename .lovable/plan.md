

## Plan: Mostrar Carrusel de Servicios Recomendados en Desktop y Corregir Navegación

### Resumen de Cambios

1. **Agregar "Servicios recomendados" en vista Desktop**: Actualmente solo se muestra en móvil
2. **Corregir ruta de navegación**: La navegación actual usa una ruta inexistente

---

### Problema Identificado: Navegación Incorrecta

La ruta actual en `RecommendedServiceCard` y `CategoryListingCard` es:
```
/client/services/${listing.id}  ← NO EXISTE
```

La ruta correcta definida en las rutas es:
```
/client/service/${providerId}/${serviceId}  ← RUTA CORRECTA
```

---

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/ClientServices.tsx` | Agregar sección "Servicios recomendados" en layout desktop |
| `src/components/client/RecommendedServiceCard.tsx` | Corregir ruta de navegación |
| `src/components/client/CategoryListingCard.tsx` | Corregir ruta de navegación |
| `src/hooks/useRecommendedListings.ts` | Incluir `provider_id` directamente en el objeto retornado |

---

### Cambio 1: Agregar Carrusel en Vista Desktop

**Archivo**: `src/pages/ClientServices.tsx`

Agregar la sección de "Servicios recomendados" después del grid de categorías en el layout desktop:

```typescript
// Desktop layout (líneas 142-177)
return (
  <ClientPageLayout title="Explora nuestras categorías de servicio">
    {/* Grid de categorías existente */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 px-2 md:px-6">
      {/* ... categorías ... */}
    </div>
    
    {/* NUEVO: Sección de Servicios Recomendados para Desktop */}
    <section className="mt-8 px-2 md:px-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        Servicios recomendados
      </h2>
      <RecommendedServicesCarousel 
        listings={recommendedListings} 
        isLoading={recommendedLoading}
      />
    </section>
  </ClientPageLayout>
);
```

---

### Cambio 2: Corregir Navegación en RecommendedServiceCard

**Archivo**: `src/components/client/RecommendedServiceCard.tsx`

```typescript
// ANTES (línea 57-59):
const handleClick = () => {
  navigate(`/client/services/${listing.id}`);
};

// DESPUÉS:
const handleClick = () => {
  const providerId = listing.provider?.id;
  if (providerId) {
    navigate(`/client/service/${providerId}/${listing.id}`);
  }
};
```

---

### Cambio 3: Corregir Navegación en CategoryListingCard

**Archivo**: `src/components/client/CategoryListingCard.tsx`

Primero, actualizar la interface para incluir `provider.id`:

```typescript
// ANTES:
interface CategoryListingCardProps {
  listing: {
    id: string;
    title: string;
    gallery_images: string[] | null;
    provider: {
      name: string | null;
      avatar_url: string | null;
      average_rating: number | null;
    } | null;
  };
}

// DESPUÉS:
interface CategoryListingCardProps {
  listing: {
    id: string;
    title: string;
    gallery_images: string[] | null;
    provider: {
      id: string;  // ← AGREGAR
      name: string | null;
      avatar_url: string | null;
      average_rating: number | null;
    } | null;
  };
}

// Y corregir la navegación:
const handleClick = () => {
  const providerId = listing.provider?.id;
  if (providerId) {
    navigate(`/client/service/${providerId}/${listing.id}`);
  }
};
```

---

### Flujo de Navegación Corregido

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Flujo de Navegación                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Usuario hace click en tarjeta de "Chef privado"                │
│           │                                                     │
│           ▼                                                     │
│  handleClick() se ejecuta                                       │
│           │                                                     │
│           ▼                                                     │
│  navigate(`/client/service/${providerId}/${listingId}`)         │
│  Ejemplo: /client/service/abc123/def456                         │
│           │                                                     │
│           ▼                                                     │
│  React Router match: /client/service/:providerId/:serviceId     │
│           │                                                     │
│           ▼                                                     │
│  Renderiza: ClientProviderServiceDetail                         │
│           │                                                     │
│           ▼                                                     │
│  Pantalla: "Jousin koo - Chef privado" con detalles del servicio│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Resultado Visual Esperado

**Vista Desktop después de los cambios:**

```text
┌──────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Explora nuestras categorías de servicio          │
│             │                                                    │
│  Servicios  │  ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  Reservas   │  │  Hogar  │ │Mascotas │ │ Clases  │              │
│  Facturas   │  └─────────┘ └─────────┘ └─────────┘              │
│  Perfil     │  ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│             │  │ Cuidado │ │Deportes │ │  Otros  │              │
│             │  │ Personal│ │         │ │         │              │
│             │  └─────────┘ └─────────┘ └─────────┘              │
│             │                                                    │
│             │  Servicios recomendados  ← NUEVO EN DESKTOP        │
│             │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│             │  │  Chef  │ │ Manicur│ │Tutorías│ │ Flores │ →    │
│             │  └────────┘ └────────┘ └────────┘ └────────┘      │
│             │                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Al hacer click en "Chef privado":**
- Navega a `/client/service/{providerId}/{listingId}`
- Muestra la pantalla de detalles del servicio (como en la imagen proporcionada)

---

### Orden de Implementación

1. Modificar `useRecommendedListings.ts` - Asegurar que `provider.id` esté disponible
2. Modificar `CategoryListingCard.tsx` - Agregar `id` a interface de provider y corregir navegación
3. Modificar `RecommendedServiceCard.tsx` - Corregir navegación usando `provider.id`
4. Modificar `ClientServices.tsx` - Agregar sección de recomendados en layout desktop

