
# Plan: Restaurar Logo Original de Gato

## Objetivo
Reemplazar el logo actual con el logo original "gato" (tipografía negra estilizada con orejas de gato en la "g") en la landing page y en la navegación móvil.

## Archivos Afectados

| Archivo | Acción |
|---------|--------|
| `public/gato-logo.png` | Reemplazar con el logo original subido |

## Acciones a Realizar

1. **Copiar el logo original** desde `user-uploads://gato-07_copy.png` a `public/gato-logo.png`
   - Esto sobrescribirá el archivo actual
   - Ambos componentes (LandingPage y MobileNav) ya referencian esta ruta, por lo que no se requieren cambios en el código

## Componentes que Mostrarán el Logo Actualizado

- **Landing Page** (`src/pages/LandingPage.tsx`): Logo centrado con dimensiones `w-40 md:w-48`
- **Barra de Navegación Móvil** (`src/components/layout/MobileNav.tsx`): Logo con altura `h-7`

## Resultado Esperado
El logo original de "gato" (texto negro estilizado) se mostrará tanto en la página de inicio como en la barra de navegación superior en la vista móvil.
