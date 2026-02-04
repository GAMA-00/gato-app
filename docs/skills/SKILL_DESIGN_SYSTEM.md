# 🎨 Skill: Sistema de Diseño Gato App

> **Versión:** 1.0 DOE  
> **Última actualización:** Febrero 2026

## Contexto

Esta skill documenta el sistema de diseño completo de Gato App. Debe consultarse SIEMPRE antes de implementar componentes visuales.

---

## 🎯 Filosofía de Diseño

### Principios Core

| Principio | Descripción |
|-----------|-------------|
| **Calidez** | Color coral como acento cálido y acogedor |
| **Simplicidad** | Interfaces limpias, sin ruido visual |
| **Mobile-First** | Diseñado primero para móvil, adaptado a desktop |
| **Accesibilidad** | Contraste adecuado, touch targets mínimos 44px |
| **Consistencia** | Tokens semánticos en todo el proyecto |

### Personalidad de Marca

```
Gato App es:
- Amigable y accesible
- Profesional pero no corporativo
- Moderno sin ser minimalista extremo
- Confiable para servicios del hogar
```

---

## 🎨 Paleta de Colores

### Tokens Principales (HSL)

```css
:root {
  /* === MARCA === */
  --primary: 10 68% 60%;           /* Coral Gato #de7153 */
  --primary-foreground: 0 0% 100%; /* Blanco sobre coral */
  
  /* Variantes Coral */
  --coral: 10 68% 60%;             /* #de7153 - Principal */
  --coral-light: 16 55% 64%;       /* #D58870 - Hover/Light */
  --coral-dark: 13 47% 32%;        /* #773E2D - Active/Dark */
  
  /* === FONDOS === */
  --background: 0 0% 98%;          /* #F9F9F9 - Fondo app */
  --card: 0 0% 96%;                /* #F5F5F5 - Fondo tarjetas */
  --secondary: 0 0% 94%;           /* #F0F0F0 - Fondo alternativo */
  --muted: 0 0% 96%;               /* Elementos silenciados */
  
  /* === TEXTO === */
  --foreground: 20 6% 10%;         /* #1C1A19 - Texto principal */
  --muted-foreground: 0 0% 40%;    /* Texto secundario */
  --card-foreground: 20 6% 10%;    /* Texto en cards */
  
  /* === ESTADOS === */
  --destructive: 0 84% 60%;        /* Rojo - Errores/Eliminar */
  --destructive-foreground: 0 0% 98%;
  
  --success: 142 76% 36%;          /* Verde - Éxito/Completado */
  --success-foreground: 0 0% 100%;
  
  --warning: 28 92% 54%;           /* Naranja - Advertencias */
  --warning-foreground: 0 0% 100%;
  
  /* === UI === */
  --border: 0 0% 88%;              /* #E0E0E0 - Bordes */
  --input: 0 0% 88%;               /* Bordes de inputs */
  --ring: 10 68% 60%;              /* Focus ring (coral) */
  
  /* === ESPACIADO === */
  --radius: 0.75rem;               /* Border radius base */
}
```

### Cuándo Usar Cada Color

| Color | Uso Correcto | Ejemplo |
|-------|-------------|---------|
| `primary` | CTAs principales, links, iconos activos | Botón "Reservar" |
| `background` | Fondo de páginas | `<main>` |
| `card` | Fondo de tarjetas | `<Card>` |
| `foreground` | Texto principal | Títulos, párrafos |
| `muted-foreground` | Texto secundario | Subtítulos, hints |
| `destructive` | Acciones destructivas | Botón "Eliminar" |
| `success` | Estados exitosos, montos | Badge "Completado" |
| `warning` | Alertas, slots recomendados | Banner de aviso |
| `border` | Separadores, bordes | Líneas divisorias |

---

## 📐 Tipografía

### Escala Tipográfica

| Elemento | Tamaño Desktop | Tamaño Mobile | Peso |
|----------|----------------|---------------|------|
| H1 | 1.5rem (24px) | 1.25rem (20px) | 700 |
| H2 | 1.25rem (20px) | 1.125rem (18px) | 600 |
| H3 | 1.125rem (18px) | 1rem (16px) | 600 |
| Body | 1rem (16px) | 1rem (16px) | 400 |
| Small | 0.875rem (14px) | 0.875rem (14px) | 400 |
| Caption | 0.75rem (12px) | 0.75rem (12px) | 400 |

### Clases Tailwind

```tsx
// Títulos
<h1 className="text-2xl font-bold md:text-3xl">  // H1
<h2 className="text-xl font-semibold md:text-2xl">  // H2
<h3 className="text-lg font-semibold">  // H3

// Texto
<p className="text-base">  // Body
<p className="text-sm text-muted-foreground">  // Small/Secondary
<span className="text-xs">  // Caption
```

---

## 📦 Espaciado

### Sistema de Spacing

| Token | Valor | Uso |
|-------|-------|-----|
| `1` | 4px | Micro spacing |
| `2` | 8px | Espaciado mínimo |
| `3` | 12px | Espaciado entre elementos |
| `4` | 16px | Padding base |
| `5` | 20px | Espaciado medio |
| `6` | 24px | Padding de secciones |
| `8` | 32px | Separación de secciones |
| `12` | 48px | Espaciado grande |
| `16` | 64px | Espaciado de página |

### Patrones Comunes

```tsx
// Padding de página
<div className="p-4 md:p-6 lg:p-8">

// Gap en grids
<div className="grid gap-4 md:gap-6">

// Margin entre secciones
<section className="mb-8 md:mb-12">

// Padding interno de cards
<CardContent className="p-4 md:p-6">
```

---

## 🔲 Componentes Base

### Botones

```tsx
// Variantes disponibles
<Button variant="default">Primario</Button>      // Coral con texto blanco
<Button variant="outline">Secundario</Button>    // Borde coral
<Button variant="ghost">Terciario</Button>       // Sin fondo
<Button variant="destructive">Eliminar</Button>  // Rojo

// Tamaños
<Button size="sm">Pequeño</Button>   // h-9
<Button size="default">Normal</Button> // h-10
<Button size="lg">Grande</Button>    // h-11

// Con icono
<Button>
  <Plus className="w-4 h-4 mr-2" />
  Agregar
</Button>

// Loading state
<Button disabled={isLoading}>
  {isLoading ? (
    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  ) : (
    <Save className="w-4 h-4 mr-2" />
  )}
  Guardar
</Button>
```

### Cards

```tsx
// Card básica
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenido */}
  </CardContent>
  <CardFooter>
    <Button>Acción</Button>
  </CardFooter>
</Card>

// Card con estilos custom
<Card className="app-card">  // Usa tokens de marca
<Card className="app-card-alt">  // Variante alternativa

// Card con hover
<Card className="hover:shadow-lg transition-shadow duration-200">
```

### Inputs

```tsx
// Input básico
<Input placeholder="Email" />

// Con label
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>

// Con error
<Input className="border-destructive" />
<p className="text-sm text-destructive">Error message</p>

// Textarea
<Textarea placeholder="Notas..." rows={4} />
```

### Badges

```tsx
// Variantes por estado
<Badge>Default</Badge>
<Badge variant="secondary">Secundario</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Error</Badge>

// Custom para estados
<Badge className="bg-success text-success-foreground">Completado</Badge>
<Badge className="bg-warning text-warning-foreground">Pendiente</Badge>
```

---

## 📱 Responsive Design

### Breakpoints

| Breakpoint | Min Width | Dispositivo |
|------------|-----------|-------------|
| (default) | 0px | Móviles |
| `sm` | 640px | Móviles grandes |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Monitores grandes |

### Patrones Mobile-First

```tsx
// Grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Flexbox responsive
<div className="flex flex-col md:flex-row gap-4">

// Ocultar/mostrar
<div className="hidden md:block">  // Solo desktop
<div className="md:hidden">        // Solo mobile

// Padding responsive
<div className="p-4 md:p-6 lg:p-8">

// Texto responsive
<h1 className="text-xl md:text-2xl lg:text-3xl">
```

### Safe Areas (Mobile)

```tsx
// Padding para navegación bottom
<main className="pb-safe">  // Usa env(safe-area-inset-bottom)

// O manualmente
<main className="pb-20">  // Para bottom nav
```

---

## ✨ Animaciones

### Animaciones Definidas

```css
/* En index.css */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

### Uso en Componentes

```tsx
// Clases de utilidad
<div className="animate-fade-in">
<div className="animate-slide-up">
<div className="animate-scale-in">

// Framer Motion
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>

// Hover transitions
<Card className="hover:shadow-lg transition-shadow duration-200">
<Button className="transition-colors duration-150">
```

### Timing Functions

| Clase | Duración | Uso |
|-------|----------|-----|
| `duration-150` | 150ms | Micro-interacciones |
| `duration-200` | 200ms | Hovers, toggles |
| `duration-300` | 300ms | Modales, sheets |
| `duration-500` | 500ms | Page transitions |

---

## 🔧 Clases Utilitarias Custom

### Definidas en index.css

```css
/* Card con estilos de marca */
.app-card {
  @apply bg-app-card rounded-xl border border-app-border shadow-card;
}

.app-card-alt {
  @apply bg-app-cardAlt rounded-xl border border-app-border shadow-card;
}

/* Efecto glassmorphism */
.glassmorphism {
  @apply bg-white/95 md:bg-white/80 backdrop-blur-md border border-white/20 shadow-sm;
}

/* Safe area para bottom nav */
.pb-safe {
  padding-bottom: calc(env(safe-area-inset-bottom) + 5rem);
}

/* Sin scrollbar */
.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
```

---

## ❌ Anti-Patrones

### NO Hacer

```tsx
// ❌ Colores hardcodeados
<div className="bg-white text-gray-800">
<Button className="bg-blue-500">

// ❌ Estilos inline para colores
<div style={{ backgroundColor: '#de7153' }}>

// ❌ Valores mágicos de spacing
<div className="p-[13px] mt-[47px]">

// ❌ Breakpoints inconsistentes
<div className="hidden sm:block md:hidden lg:block">
```

### SÍ Hacer

```tsx
// ✅ Tokens semánticos
<div className="bg-background text-foreground">
<Button className="bg-primary">

// ✅ Sistema de spacing
<div className="p-4 mt-12">

// ✅ Mobile-first progresivo
<div className="block md:hidden">
<div className="hidden md:block">
```

---

## 📋 Checklist de Diseño

Antes de enviar cualquier cambio de UI, verificar:

- [ ] Usa tokens semánticos (no colores directos)
- [ ] Es responsive (mobile-first)
- [ ] Tiene estados hover/focus visibles
- [ ] Contraste cumple WCAG AA
- [ ] Touch targets mínimo 44px
- [ ] Animaciones suaves (< 300ms para micro-interacciones)
- [ ] Consistente con componentes existentes
- [ ] NO modifica lógica de negocio
