
## Plan: Agregar Opción "Pago Directo al Proveedor" en Checkout

### Objetivo
Agregar una segunda opción de pago en la pantalla de checkout llamada "Pago directo al proveedor" que permita crear reservas sin requerir datos de tarjeta, omitiendo el procesamiento de pago con Onvopay.

### Flujo Actual vs Flujo Propuesto

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FLUJO ACTUAL                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Resumen de pago → 2. Seleccionar tarjeta → 3. Confirmar y Pagar        │
│                            ↓                                                 │
│                    Crear cita + Autorizar pago con Onvopay                  │
│                            ↓                                                 │
│                    Confirmación de reserva                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            FLUJO PROPUESTO                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Resumen de pago → 2. Seleccionar método de pago:                        │
│                            │                                                 │
│                    ┌───────┴───────┐                                        │
│                    │               │                                         │
│              [Tarjeta]     [Pago Directo]                                   │
│                    │               │                                         │
│                    ↓               ↓                                         │
│            Flujo actual    Solo crear cita                                  │
│            (Onvopay)       (sin pago online)                                │
│                    │               │                                         │
│                    └───────┬───────┘                                        │
│                            ↓                                                 │
│                    Confirmación de reserva                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Cambios a Implementar

#### 1. Crear Componente Selector de Método de Pago
**Nuevo archivo: `src/components/payments/PaymentMethodTypeSelector.tsx`**

Componente que muestra las dos opciones:
- **Pago con tarjeta** (icono CreditCard): Flujo actual con tarjeta
- **Pago directo al proveedor** (icono Banknote/Wallet): Sin procesamiento de tarjeta

UI propuesta:
- Dos tarjetas clickables con radio button visual
- La opción de tarjeta mostrará el selector de tarjetas guardadas o formulario de nueva tarjeta
- La opción de pago directo mostrará un mensaje informativo

---

#### 2. Modificar SimplifiedCheckoutForm.tsx

**Agregar nuevo estado:**
```typescript
const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'direct'>('card');
```

**Modificar validateForm():**
- Si `paymentMethodType === 'direct'`, solo validar teléfono (requerido para contacto)
- Omitir validación de datos de tarjeta

**Modificar handleSubmit():**
- PASO 1: Crear appointment (sin cambios) → `create_appointment_with_slot`
- PASO 2: Si `paymentMethodType === 'direct'`:
  - Omitir tokenización de tarjeta
  - Omitir llamada a `onvopay-authorize` o `onvopay-create-subscription`
  - Redirigir directamente a `/booking-confirmation/{appointmentId}?type={once|recurring}&payment=direct`
- Si `paymentMethodType === 'card'`: Flujo actual sin cambios

**Modificar render:**
- Agregar `PaymentMethodTypeSelector` al inicio
- Mostrar `SavedCardsSelector` o `NewCardForm` solo si `paymentMethodType === 'card'`

---

#### 3. Modificar StickyPaymentFooter.tsx

**Agregar prop para tipo de método:**
```typescript
interface StickyPaymentFooterProps {
  amount: number;
  isProcessing: boolean;
  hasSubmitted: boolean;
  onSubmit: (e: React.FormEvent) => void;
  isDirectPayment?: boolean; // Nueva prop
}
```

**Cambiar texto del botón según método:**
- Si `isDirectPayment`: "Confirmar Reserva"
- Si no: "Confirmar y Pagar {amount}"

**Cambiar mensaje de seguridad:**
- Si `isDirectPayment`: "Pagarás directamente al proveedor"
- Si no: "Pago seguro encriptado"

---

#### 4. Actualizar BookingConfirmation.tsx (opcional)

Agregar parámetro `payment` para mostrar mensaje específico:
- Si `payment=direct`: "El pago se realizará directamente con el proveedor"

---

### Archivos a Modificar

| Archivo | Tipo de Cambio |
|---------|----------------|
| `src/components/payments/PaymentMethodTypeSelector.tsx` | **CREAR** |
| `src/components/payments/SimplifiedCheckoutForm.tsx` | Modificar |
| `src/components/checkout/StickyPaymentFooter.tsx` | Modificar |
| `src/pages/BookingConfirmation.tsx` | Modificar (menor) |

---

### Diseño UI del Selector

```text
┌─────────────────────────────────────────────────────────────────┐
│  Selecciona Método de Pago                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ◉  💳  Pago con tarjeta                   [Seleccionado] │   │
│  │       Pago seguro procesado por Onvopay                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○  💵  Pago directo al proveedor                        │   │
│  │       Pagarás en efectivo o transferencia al proveedor  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Sección Técnica

#### SimplifiedCheckoutForm.tsx - Cambios Clave

```typescript
// Nuevo estado
const [paymentMethodType, setPaymentMethodType] = useState<'card' | 'direct'>('card');

// validateForm() modificado
const validateForm = () => {
  const errors: Record<string, string> = {};
  
  // Teléfono siempre requerido (para contacto)
  if (!billingData.phone) { /* ... */ }
  
  // Validar tarjeta SOLO si es pago con tarjeta
  if (paymentMethodType === 'card') {
    if (showNewCardForm) {
      // validar datos de nueva tarjeta...
    } else if (!selectedCardId) {
      errors.card = 'Selecciona un método de pago';
    }
  }
  // Si es 'direct', no se valida tarjeta
  
  return Object.keys(errors).length === 0;
};

// handleSubmit() - después de crear appointment
if (paymentMethodType === 'direct') {
  // Omitir todo el flujo de Onvopay
  console.log('✅ Reserva creada con pago directo');
  
  // Redirigir a confirmación
  window.location.href = `/booking-confirmation/${newAppointmentId}?type=${isRecurring ? 'recurring' : 'once'}&payment=direct`;
  return;
}
// ... resto del flujo de tarjeta sin cambios
```

#### Render actualizado

```tsx
return (
  <div className="space-y-4">
    {/* Selector de tipo de método de pago */}
    <PaymentMethodTypeSelector
      selected={paymentMethodType}
      onSelect={setPaymentMethodType}
    />
    
    {/* Mostrar selector de tarjetas solo si es pago con tarjeta */}
    {paymentMethodType === 'card' && (
      showNewCardForm ? (
        <NewCardForm ... />
      ) : (
        <SavedCardsSelector ... />
      )
    )}
    
    {/* Mensaje para pago directo */}
    {paymentMethodType === 'direct' && (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <Banknote className="h-12 w-12 mx-auto text-green-600 mb-3" />
            <p className="text-sm text-muted-foreground">
              Coordinarás el pago directamente con el proveedor
            </p>
          </div>
        </CardContent>
      </Card>
    )}
    
    {/* Footer con botón */}
    <StickyPaymentFooter
      amount={amount}
      isProcessing={isProcessing}
      hasSubmitted={hasSubmitted}
      onSubmit={handleSubmit}
      isDirectPayment={paymentMethodType === 'direct'}
    />
  </div>
);
```

---

### Beneficios

1. **Flexibilidad para usuarios**: Pueden reservar sin tener tarjeta disponible
2. **Menor fricción**: Proceso más rápido para quienes prefieren pago en efectivo
3. **Compatibilidad**: No afecta el flujo existente de pago con tarjeta
4. **Sin cambios en backend**: Solo se omite la llamada a Onvopay; la cita se crea normalmente

### Consideraciones

- Las citas con "pago directo" quedarán en estado `pending` sin registro de pago en `onvopay_payments`
- El proveedor verá la cita normalmente y podrá aceptarla/rechazarla
- El cobro real se realizará fuera del sistema (efectivo, transferencia, etc.)
