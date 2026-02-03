

# Plan: Actualizar Logo de la Barra Superior

## Resumen

Reemplazar el logo actual de Gato en la barra de navegación superior (mobile y desktop) con el nuevo logo proporcionado por el usuario (`gato_Loggos-10-2.png`).

## Análisis de la Situación Actual

El logo se utiliza en **4 ubicaciones** principales:

| Archivo | Ruta del Logo Actual | Contexto |
|---------|---------------------|----------|
| `MobileNav.tsx` | `/gato-logo.png?v=2` | Barra superior móvil |
| `DesktopNav.tsx` | `/lovable-uploads/d68195ea-...` | Sidebar desktop |
| `LandingPage.tsx` | `/gato-logo.png?v=3` | Página de inicio |
| `public/gato-logo.png` | N/A | Archivo fuente |

## Pasos de Implementación

### Paso 1: Copiar el Nuevo Logo

Copiar el archivo subido al directorio público con cache-busting:

```
user-uploads://gato_Loggos-10-2.png → public/gato-logo.png
```

### Paso 2: Actualizar MobileNav.tsx

Actualizar la referencia del logo con nuevo parámetro de versión para cache-busting:

```typescript
// Línea 34 - ANTES
src="/gato-logo.png?v=2"

// DESPUÉS
src="/gato-logo.png?v=4"
```

### Paso 3: Actualizar DesktopNav.tsx

Actualizar para usar la misma ruta consistente:

```typescript
// Línea 34 - ANTES
src="/lovable-uploads/d68195ea-57ea-4225-995d-8857c18be160.png"

// DESPUÉS
src="/gato-logo.png?v=4"
```

### Paso 4: Actualizar LandingPage.tsx

Actualizar versión para cache-busting:

```typescript
// ANTES
src="/gato-logo.png?v=3"

// DESPUÉS
src="/gato-logo.png?v=4"
```

## Archivos a Modificar

| Archivo | Acción |
|---------|--------|
| `public/gato-logo.png` | Reemplazar con nuevo logo |
| `src/components/layout/MobileNav.tsx` | Actualizar versión a `?v=4` |
| `src/components/layout/DesktopNav.tsx` | Cambiar ruta a `/gato-logo.png?v=4` |
| `src/pages/LandingPage.tsx` | Actualizar versión a `?v=4` |

## Notas Técnicas

- Se utiliza cache-busting (`?v=4`) para asegurar que los navegadores carguen el nuevo logo inmediatamente
- El logo incluye el tagline "Servicios a domicilio" en la imagen, lo cual es ideal para la landing page pero podría requerir ajuste de tamaño en la barra móvil donde el espacio es limitado
- Se consolidan todas las referencias a una sola ruta (`/gato-logo.png`) para mantener consistencia

