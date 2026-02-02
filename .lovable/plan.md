
# Plan: Actualizar Logo del Landing Page

## Objetivo
Reemplazar el logo actual del landing page con el nuevo logo proporcionado que incluye el texto "Servicios a domicilio" integrado.

## Cambios a Realizar

### 1. Copiar el Nuevo Asset
Copiar el archivo subido `gato_Loggos-10.png` a la carpeta `public/` como el nuevo logo:
- **Origen**: `user-uploads://gato_Loggos-10.png`
- **Destino**: `public/gato-logo.png` (reemplazando el existente)

### 2. Actualizar `LandingPage.tsx`
Modificar la referencia del logo para forzar cache-busting (incrementar versión de `?v=2` a `?v=3`):

```typescript
// ANTES (línea 20)
src="/gato-logo.png?v=2"

// DESPUÉS
src="/gato-logo.png?v=3"
```

### 3. Eliminar Texto Redundante (Opcional - Recomendado)
Como el nuevo logo ya incluye "Servicios a domicilio", el texto de bienvenida podría ajustarse para evitar redundancia:

```typescript
// ANTES (línea 27-29)
<h1 className="text-2xl md:text-3xl font-medium text-app-text text-center">
  Bienvenido a Gato
</h1>

// DESPUÉS - Simplificar ya que el logo tiene el tagline
<h1 className="text-xl md:text-2xl font-medium text-app-text text-center">
  Bienvenido
</h1>
```

Alternativamente, mantener "Bienvenido a Gato" si se desea reforzar el nombre.

### 4. Ajustar Tamaño del Contenedor del Logo
El nuevo logo tiene proporciones diferentes (más ancho por el tagline), por lo que podría necesitar ajuste:

```typescript
// ANTES (línea 18)
<div className="w-40 md:w-48">

// DESPUÉS - Más ancho para acomodar el tagline
<div className="w-56 md:w-64">
```

## Resumen de Archivos

| Acción | Archivo |
|--------|---------|
| Copiar (reemplazar) | `public/gato-logo.png` |
| Editar | `src/pages/LandingPage.tsx` |

## Resultado Esperado
El landing page mostrará el nuevo logo con el tagline "Servicios a domicilio" integrado, correctamente dimensionado y con cache-busting para evitar problemas de caché en navegadores.
