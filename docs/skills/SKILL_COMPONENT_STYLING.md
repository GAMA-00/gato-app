# 🖌️ Skill: Styling de Componentes

> **Versión:** 1.0 DOE  
> **Última actualización:** Febrero 2026

## Contexto

Esta skill guía el proceso de estilizar componentes de forma consistente con el sistema de diseño de Gato App.

---

## 🎯 Principios de Styling

### 1. Tokens Semánticos SIEMPRE

```tsx
// ✅ CORRECTO - Usa tokens
<div className="bg-background text-foreground border-border">
<Card className="bg-card text-card-foreground">
<Button className="bg-primary text-primary-foreground">
<Badge className="bg-destructive text-destructive-foreground">

// ❌ INCORRECTO - Colores directos
<div className="bg-white text-gray-800 border-gray-200">
<Button className="bg-orange-500 text-white">
<Badge className="bg-red-500">
```

### 2. Composición con `cn()`

```tsx
import { cn } from '@/lib/utils';

// Combinar clases condicionales
<div
  className={cn(
    "base-classes",
    isActive && "active-classes",
    isDisabled && "disabled-classes",
    variant === "primary" && "primary-classes"
  )}
>
```

### 3. Mobile-First Responsive

```tsx
// ✅ CORRECTO - Mobile first
<div className="p-4 md:p-6 lg:p-8">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
<span className="text-sm md:text-base">

// ❌ INCORRECTO - Desktop first
<div className="p-8 sm:p-4">
<div className="grid-cols-3 sm:grid-cols-1">
```

---

## 🔧 Modificar Componentes shadcn

### Agregar Variante a Button

```tsx
// src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground ...",
        outline: "border border-input bg-background hover:bg-accent ...",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        
        // ✅ Nueva variante
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### Agregar Variante a Badge

```tsx
// src/components/ui/badge.tsx
const badgeVariants = cva(
  "inline-flex items-center rounded-full ...",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        
        // ✅ Nuevas variantes para estados
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        pending: "border-transparent bg-yellow-100 text-yellow-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

---

## 🎨 Estilos por Contexto

### Estados de Cita

```tsx
const getAppointmentStyles = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        badge: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
        border: 'border-l-yellow-500',
      };
    case 'confirmed':
      return {
        badge: 'bg-blue-100 text-blue-800',
        icon: CheckCircle,
        border: 'border-l-blue-500',
      };
    case 'completed':
      return {
        badge: 'bg-success/10 text-success',
        icon: Check,
        border: 'border-l-success',
      };
    case 'cancelled':
      return {
        badge: 'bg-destructive/10 text-destructive',
        icon: X,
        border: 'border-l-destructive',
      };
    default:
      return {
        badge: 'bg-muted text-muted-foreground',
        icon: HelpCircle,
        border: 'border-l-muted',
      };
  }
};

// Uso
const styles = getAppointmentStyles(appointment.status);
<Card className={cn("border-l-4", styles.border)}>
  <Badge className={styles.badge}>
    <styles.icon className="h-3 w-3 mr-1" />
    {statusLabel}
  </Badge>
</Card>
```

### Niveles de Proveedor

```tsx
const getProviderLevelStyles = (level: string) => {
  const levels = {
    beginner: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
    },
    trusty: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-300',
    },
    recommended: {
      bg: 'bg-primary/10',
      text: 'text-primary',
      border: 'border-primary/30',
    },
    expert: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-400',
    },
  };
  return levels[level] || levels.beginner;
};
```

---

## 📐 Patrones de Layout

### Container Responsivo

```tsx
// Container estándar
<div className="container mx-auto px-4 md:px-6">

// Container con max-width
<div className="max-w-2xl mx-auto px-4">

// Full-width con padding
<div className="w-full px-4 md:px-6 lg:px-8">
```

### Grid Systems

```tsx
// Grid de cards (1-2-3 columnas)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Grid de slots (3 columnas fijas)
<div className="grid grid-cols-3 gap-2">

// Grid con sidebar
<div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

// Grid 50/50 que stackea en mobile
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

### Flex Patterns

```tsx
// Horizontal con space-between
<div className="flex items-center justify-between">

// Stack vertical con gap
<div className="flex flex-col gap-4">

// Horizontal que stackea en mobile
<div className="flex flex-col md:flex-row gap-4">

// Centrado absoluto
<div className="flex items-center justify-center h-full">
```

---

## ✨ Efectos Visuales

### Sombras

```tsx
// Sombra sutil (cards)
<Card className="shadow-sm">

// Sombra media (hover)
<Card className="shadow-md hover:shadow-lg transition-shadow">

// Sombra dramática (modales)
<div className="shadow-xl">

// Sombra con color
<Card className="shadow-primary/20 shadow-lg">
```

### Bordes

```tsx
// Borde estándar
<div className="border border-border">

// Borde con color de estado
<Card className="border-l-4 border-l-primary">

// Borde focus
<Input className="focus:ring-2 focus:ring-ring focus:ring-offset-2">

// Borde redondeado
<div className="rounded-lg">  // 0.5rem
<div className="rounded-xl">  // 0.75rem (default --radius)
<div className="rounded-full">  // Círculo
```

### Gradientes

```tsx
// Gradiente de fondo
<div className="bg-gradient-to-br from-primary/10 to-secondary">

// Gradiente de texto
<span className="bg-gradient-to-r from-primary to-coral-dark bg-clip-text text-transparent">

// Overlay gradiente
<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
```

### Glassmorphism

```tsx
// Efecto glass
<div className="glassmorphism">
// Equivale a: bg-white/95 md:bg-white/80 backdrop-blur-md border border-white/20 shadow-sm

// Glass custom
<div className="bg-background/80 backdrop-blur-sm border border-white/10">
```

---

## 🔄 Transiciones

### Hover States

```tsx
// Transición de color
<Button className="transition-colors duration-150">

// Transición de sombra
<Card className="hover:shadow-lg transition-shadow duration-200">

// Transición de escala
<div className="hover:scale-105 transition-transform duration-200">

// Transición combinada
<Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
```

### Focus States

```tsx
// Ring de focus
<Button className="focus:ring-2 focus:ring-ring focus:ring-offset-2">

// Outline de focus
<Input className="focus:outline-none focus:ring-2 focus:ring-primary">

// Focus visible only
<Button className="focus-visible:ring-2 focus-visible:ring-ring">
```

### Active/Pressed States

```tsx
// Escala al presionar
<Button className="active:scale-95 transition-transform">

// Opacidad al presionar
<Card className="active:opacity-90 cursor-pointer">
```

---

## 📱 Estilos Mobile-Specific

### Touch Targets

```tsx
// Mínimo 44px para touch
<Button className="min-h-11 min-w-11">  // h-11 = 44px

// Área de tap expandida
<button className="p-2 -m-2">  // Padding interno, margin negativo
  <Icon className="h-5 w-5" />
</button>
```

### Safe Areas

```tsx
// Bottom navigation safe area
<nav className="pb-safe">  // Uses env(safe-area-inset-bottom)

// Manual safe area
<div className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
```

### Scroll Optimization

```tsx
// Scroll horizontal
<div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar">

// Scroll con snap
<div className="snap-x snap-mandatory overflow-x-auto">
  <div className="snap-start">Item 1</div>
  <div className="snap-start">Item 2</div>
</div>
```

---

## 🚫 Anti-Patrones

### NO Hacer

```tsx
// ❌ Estilos inline
<div style={{ backgroundColor: 'red', marginTop: '20px' }}>

// ❌ Important overrides
<div className="!bg-white !p-4">

// ❌ Valores mágicos
<div className="p-[13px] mt-[47px] w-[317px]">

// ❌ Colores hex/rgb directos
<div className="bg-[#de7153]">

// ❌ Clases conflictivas
<div className="p-4 p-6">

// ❌ Breakpoints inconsistentes
<div className="md:hidden lg:block xl:hidden">
```

### SÍ Hacer

```tsx
// ✅ Tokens del sistema
<div className="bg-primary text-primary-foreground">

// ✅ Sistema de spacing
<div className="p-4 mt-8">

// ✅ Width/heights del sistema
<div className="w-64 h-48">  // 16rem, 12rem

// ✅ Mobile-first progresivo
<div className="hidden md:block">
<div className="md:hidden">
```

---

## 📋 Checklist de Styling

Antes de enviar cambios de estilo:

- [ ] ¿Usa tokens semánticos exclusivamente?
- [ ] ¿Las clases son mobile-first?
- [ ] ¿Hay transiciones en estados interactivos?
- [ ] ¿Los touch targets son >= 44px?
- [ ] ¿Se usa `cn()` para clases condicionales?
- [ ] ¿No hay valores mágicos (px específicos)?
- [ ] ¿Los focus states son visibles?
- [ ] ¿Es consistente con componentes similares?
