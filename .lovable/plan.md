
# Plan: Optimizar Layout del Logo en Vista Móvil

## Problema Actual
En la vista móvil del landing page, el logo está centrado verticalmente en la pantalla completa (`flex items-center justify-center`), lo que desperdicia espacio visual y el logo parece muy grande para dispositivos pequeños.

## Cambios Propuestos

### Archivo: `src/pages/LandingPage.tsx`

**1. Reducir tamaño del logo en móvil**
```typescript
// ANTES (línea 18)
<div className="w-56 md:w-64">

// DESPUÉS - Logo más pequeño en móvil
<div className="w-44 md:w-64">
```

**2. Posicionar el contenido más arriba en móvil**

Cambiar el layout del contenedor principal para que el contenido esté más arriba en móvil pero centrado en desktop:

```typescript
// ANTES (línea 14)
<div className="min-h-screen bg-background flex items-center justify-center px-4">

// DESPUÉS - Arriba en móvil, centrado en desktop
<div className="min-h-screen bg-background flex items-start md:items-center justify-center px-4 pt-20 md:pt-0">
```

**3. Reducir espaciado vertical entre elementos en móvil**

```typescript
// ANTES (línea 15)
<div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-8">

// DESPUÉS - Menos espacio en móvil
<div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-6 md:space-y-8">
```

```typescript
// ANTES (línea 17)
<div className="flex flex-col items-center space-y-6">

// DESPUÉS - Menos espacio entre logo y texto
<div className="flex flex-col items-center space-y-4 md:space-y-6">
```

## Resumen de Cambios

| Línea | Cambio |
|-------|--------|
| 14 | Agregar `items-start pt-20` para móvil, `md:items-center md:pt-0` para desktop |
| 15 | Cambiar `space-y-8` a `space-y-6 md:space-y-8` |
| 17 | Cambiar `space-y-6` a `space-y-4 md:space-y-6` |
| 18 | Cambiar ancho de `w-56` a `w-44` en móvil |

## Resultado Esperado
- En móvil: Logo más pequeño y posicionado hacia arriba con padding-top de 80px
- En desktop: Layout centrado igual que antes con tamaño de logo w-64
- Mejor aprovechamiento del espacio vertical en dispositivos móviles
- Jerarquía visual mejorada
