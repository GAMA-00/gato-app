# 🛠️ Skill: Modificar Componentes UI

## Contexto

Esta skill te guía para modificar componentes existentes de forma segura.

---

## Reglas Generales

### 1. NUNCA cambiar lógica de negocio si el request es de UI

```typescript
// ❌ MAL - Cambiar lógica al modificar UI
const handleClick = async () => {
  // Cambié la lógica de validación aquí...
  await submitData();
};

// ✅ BIEN - Solo cambiar UI
<Button 
  variant="outline"  // Cambiado de "default"
  size="lg"          // Cambiado de "md"
>
  Texto actualizado
</Button>
```

### 2. Usar tokens semánticos de Tailwind

```typescript
// ❌ MAL
<div className="bg-white text-gray-800 border-blue-500">

// ✅ BIEN
<div className="bg-background text-foreground border-primary">
```

### 3. Mantener responsividad

```typescript
// ✅ BIEN - Responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ❌ MAL - Solo desktop
<div className="grid grid-cols-3 gap-4">
```

---

## Modificar Componente shadcn

### Paso 1: Localizar el componente

```
src/components/ui/button.tsx
src/components/ui/card.tsx
etc.
```

### Paso 2: Agregar variante (no modificar existentes)

```typescript
// button.tsx
const buttonVariants = cva("...", {
  variants: {
    variant: {
      default: "...",
      // ✅ Agregar nueva variante
      premium: "bg-gradient-to-r from-primary to-accent ...",
    }
  }
});
```

### Paso 3: Usar la variante

```typescript
<Button variant="premium">Premium Action</Button>
```

---

## Modificar Estilos Globales

### Archivo: `src/index.css`

```css
@layer base {
  :root {
    /* Modificar tokens aquí */
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
  }
  
  .dark {
    /* Tokens para dark mode */
  }
}
```

### Archivo: `tailwind.config.ts`

```typescript
// Agregar colores personalizados
theme: {
  extend: {
    colors: {
      'mi-color': 'hsl(var(--mi-color))',
    }
  }
}
```

---

## Patterns Comunes

### Card con gradiente

```typescript
<Card className="bg-gradient-to-br from-card to-muted/50">
```

### Botón con icono

```typescript
import { Plus } from 'lucide-react';

<Button>
  <Plus className="w-4 h-4 mr-2" />
  Agregar
</Button>
```

### Loading state

```typescript
<Button disabled={isLoading}>
  {isLoading ? (
    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  ) : (
    <Save className="w-4 h-4 mr-2" />
  )}
  Guardar
</Button>
```

### Empty state

```typescript
{data.length === 0 ? (
  <div className="text-center py-12 text-muted-foreground">
    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
    <p>No hay elementos</p>
  </div>
) : (
  // Mostrar lista
)}
```

---

## Animaciones

### Fade in

```typescript
<div className="animate-fade-in">
```

### Slide up

```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
>
```

### Hover effects

```typescript
<Card className="hover:shadow-lg transition-shadow duration-200">
```

---

## Checklist

- [ ] Solo cambios de UI (sin lógica de negocio)
- [ ] Tokens semánticos usados
- [ ] Responsive verificado
- [ ] Dark mode funciona
- [ ] Animaciones suaves
- [ ] Accesibilidad mantenida
