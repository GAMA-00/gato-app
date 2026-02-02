

# Plan: Ajustar Layout del Catálogo de Servicios

## Problema Identificado

En la sección de edición de variantes de servicio, el campo "Precio" es demasiado pequeño (`col-span-4`) mientras que el campo "Duración (min)" tiene espacio de sobra (`col-span-6`). Esto causa que el contenido del precio se vea cortado o apretado.

## Distribución Actual (12 columnas)

| Campo | Columnas | Porcentaje |
|-------|----------|------------|
| Precio | 4 | 33% |
| Duración | 6 | 50% |
| Botones | 2 | 17% |

## Nueva Distribución Propuesta

| Campo | Columnas | Porcentaje |
|-------|----------|------------|
| Precio | 5 | 42% |
| Duración | 5 | 42% |
| Botones | 2 | 17% |

## Cambios a Realizar

### Archivo: `src/components/services/steps/ServiceVariantEditor.tsx`

**Cambio 1 - Campo Precio (línea 178):**
```typescript
// ANTES
<div className="col-span-4">

// DESPUÉS
<div className="col-span-5">
```

**Cambio 2 - Campo Duración (línea 205):**
```typescript
// ANTES
<div className={isPostPayment === true ? "col-span-5" : (showPriceFields ? "col-span-6" : "col-span-8")}>

// DESPUÉS  
<div className={isPostPayment === true ? "col-span-5" : (showPriceFields ? "col-span-5" : "col-span-8")}>
```

## Resultado Visual Esperado

```text
┌────────────────────────────────────────────────────────┐
│ Nombre del servicio                                     │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Basico                                           │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│ Precio           Duración (min)                        │
│ ┌──────────────┐ ┌──────────────┐ ┌───┬───┐           │
│ │ $ 3          │ │ 30           │ │ ↕ │ 🗑 │           │
│ └──────────────┘ └──────────────┘ └───┴───┘           │
│                                                        │
│ Agregar precio por persona                      >      │
└────────────────────────────────────────────────────────┘
```

## Archivo a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/services/steps/ServiceVariantEditor.tsx` | Ajustar `col-span` del precio de 4→5 y duración de 6→5 |

