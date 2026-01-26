
## Plan: Corregir Divisa en Pantalla "Resumen de tu Reserva"

### Problema Identificado
En la pantalla de checkout ("Resumen de tu Reserva"), los precios siempre se muestran en USD ($) aunque el anuncio tenga configurada la moneda en CRC (₡). Esto ocurre porque:

1. **La función `formatCurrency` incorrecta**: `Checkout.tsx` importa `formatCurrency` desde `@/lib/utils.ts`, que está hardcodeada para USD
2. **La moneda no se propaga**: El objeto `checkoutData` que se pasa a `/checkout` **no incluye** el campo `currency` del listing
3. **Existe la solución**: Ya hay una función `formatCurrency` en `@/utils/currencyUtils.ts` que acepta el parámetro de moneda

### Flujo Actual vs Corregido

```text
ACTUAL (incorrecto):
┌────────────────────────────────────────────────────────────────────────────┐
│ ClientBooking.tsx                                                          │
│   effectiveServiceDetails.currency = 'CRC' ✓                               │
│           │                                                                 │
│           ▼                                                                 │
│   navigate('/checkout', { state: {                                         │
│     serviceTitle, providerName, selectedVariants, totalPrice               │
│     ❌ NO incluye currency                                                  │
│   }})                                                                       │
│           │                                                                 │
│           ▼                                                                 │
│ Checkout.tsx                                                               │
│   import { formatCurrency } from '@/lib/utils' ← Hardcoded USD             │
│   formatCurrency(amount) → "$15,255.00" ❌                                  │
└────────────────────────────────────────────────────────────────────────────┘

CORREGIDO:
┌────────────────────────────────────────────────────────────────────────────┐
│ ClientBooking.tsx                                                          │
│   effectiveServiceDetails.currency = 'CRC' ✓                               │
│           │                                                                 │
│           ▼                                                                 │
│   navigate('/checkout', { state: {                                         │
│     serviceTitle, providerName, selectedVariants, totalPrice,              │
│     currency: effectiveServiceDetails.currency ✅                           │
│   }})                                                                       │
│           │                                                                 │
│           ▼                                                                 │
│ Checkout.tsx                                                               │
│   import { formatCurrency } from '@/utils/currencyUtils'                   │
│   formatCurrency(amount, currency) → "₡15,255" ✅                           │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/ClientBooking.tsx` | Agregar `currency` al objeto de navegación a checkout |
| `src/pages/Checkout.tsx` | Cambiar import de `formatCurrency` y usar el parámetro `currency` |
| `src/components/checkout/StickyPaymentFooter.tsx` | Agregar prop `currency` y usar `formatCurrency` con moneda |
| `src/components/payments/SimplifiedCheckoutForm.tsx` | Pasar `currency` a `StickyPaymentFooter` |

---

### Cambios Detallados

#### 1. ClientBooking.tsx (línea ~545-556)
Agregar el campo `currency` al state de navegación:

```typescript
navigate('/checkout', {
  state: {
    serviceTitle: effectiveServiceDetails.title,
    providerName: effectiveServiceDetails.provider?.name,
    selectedVariants: effectiveSelectedVariants,
    selectedDate,
    selectedTime,
    clientLocation,
    bookingData,
    totalPrice,
    currency: effectiveServiceDetails?.currency || 'USD'  // ← AGREGAR
  }
});
```

#### 2. Checkout.tsx
- Cambiar el import de `formatCurrency` a usar `@/utils/currencyUtils`
- Agregar `currency` a la interface `CheckoutData`
- Usar `currency` en todas las llamadas a `formatCurrency`

```typescript
// ANTES
import { formatCurrency } from '@/lib/utils';

interface CheckoutData {
  serviceTitle: string;
  providerName: string;
  selectedVariants: any[];
  clientLocation: string;
  bookingData: any;
  totalPrice: number;
}

// formatCurrency(priceBreakdown.total)

// DESPUÉS
import { formatCurrency, type CurrencyCode } from '@/utils/currencyUtils';

interface CheckoutData {
  serviceTitle: string;
  providerName: string;
  selectedVariants: any[];
  clientLocation: string;
  bookingData: any;
  totalPrice: number;
  currency?: CurrencyCode;  // ← AGREGAR
}

// formatCurrency(priceBreakdown.total, currency)
```

#### 3. StickyPaymentFooter.tsx
Agregar prop `currency` y usarla en `formatCurrency`:

```typescript
// ANTES
import { formatCurrency } from '@/lib/utils';

interface StickyPaymentFooterProps {
  amount: number;
  // ...
}

// DESPUÉS
import { formatCurrency, type CurrencyCode } from '@/utils/currencyUtils';

interface StickyPaymentFooterProps {
  amount: number;
  currency?: CurrencyCode;  // ← AGREGAR
  // ...
}

// formatCurrency(amount, currency)
```

#### 4. SimplifiedCheckoutForm.tsx
Recibir `currency` como prop y pasarla a `StickyPaymentFooter`:

```typescript
interface SimplifiedCheckoutFormProps {
  amount: number;
  currency?: CurrencyCode;  // ← AGREGAR
  // ...
}

// En render:
<StickyPaymentFooter
  amount={amount}
  currency={currency}  // ← PASAR
  // ...
/>
```

---

### Resultado Esperado
Después de estos cambios:
- Servicios con `currency: 'USD'` → mostrarán `$15,255.00`
- Servicios con `currency: 'CRC'` → mostrarán `₡15,255`

La pantalla "Resumen de tu Reserva" para "Dani Nail Artist" mostrará correctamente:
- Esmaltado semipermanente: **₡13,500**
- Subtotal: **₡13,500**
- IVA (13%): **₡1,755**
- TOTAL: **₡15,255**
