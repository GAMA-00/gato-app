# 🛠️ Skill: Recomendación de Slots por Proximidad

## Contexto

Pilar #3 del v1 (rutas eficientes): cuando un cliente va a agendar y su cantón coincide
con el de otra cita del proveedor ese mismo día, se le recomiendan los horarios
**contiguos** a esa cita para que el proveedor "ya esté en la zona". Opcionalmente se
aplica un descuento. Ver `docs/CONCEPTO_V1.md` §8.2.

Pantallas afectadas: A-4 (vista por cantones del proveedor), BL-4 (selección de
fecha/hora del cliente), M-1 (mapa).

---

## Reglas

1. El cliente fija su ubicación (BL-2) → geocoding inverso → `appointments.canton_id`.
   (ver `SKILL_CANTONES_GEO.md`).
2. Para la fecha elegida, buscar citas **activas** del proveedor ese día en el
   **mismo cantón**.
3. Si existe al menos una:
   - El slot inmediatamente **anterior** y el inmediatamente **posterior** a esa cita
     (respetando duración + buffer) se marcan como ⭐ **recomendados**.
   - Se muestran **primero** y destacados.
   - Texto al cliente: *"Horario recomendado — el proveedor ya estará en tu zona"*.
4. Si `provider_settings.proximity_discount_enabled = true`, los slots ⭐ muestran el
   precio con `proximity_discount_pct` aplicado (ej: "9:00 AM ⭐ ₡22,500 — 10% desc.").

---

## Estados visuales de slot (agenda A-1)

| Color | Significado |
|-------|-------------|
| 🟢 Verde claro | Disponible y abierto |
| 🔵 Azul | Cita agendada (slots de la cita) |
| 🟡 Amarillo claro | Buffer de traslado (bloqueado automáticamente) |
| ⬛ Gris | Bloqueado manualmente / fuera de disponibilidad |
| 🟠 Naranja | Solicitud pendiente en ese horario |
| ⭐ Verde con estrella | Slot recomendado (mismo cantón que cita existente) |

---

## Cálculo de slots recomendados (pseudocódigo)

```typescript
// Para un día y cantón del cliente:
function recommendedSlots(daySlots, dayAppointments, clientCantonId, settings) {
  const sameCanton = dayAppointments.filter(a => a.canton_id === clientCantonId);
  const recommended = new Set<string>();

  for (const apt of sameCanton) {
    // slot libre justo antes del inicio de la cita
    const before = slotEndingAt(daySlots, apt.start_time);
    // slot libre justo después del fin de cita + buffer
    const after = slotStartingAt(daySlots, addBuffer(apt.end_time, settings));
    if (before?.is_available) recommended.add(before.id);
    if (after?.is_available)  recommended.add(after.id);
  }
  return recommended;
}

function priceFor(slot, basePrice, settings) {
  if (slot.recommended && settings.proximity_discount_enabled) {
    return Math.round(basePrice * (1 - settings.proximity_discount_pct / 100));
  }
  return basePrice;
}
```

> Respetar el **buffer**: el slot "posterior" recomendado empieza después del fin de la
> cita **+ buffer** (no pegado a la cita). Ver duración del buffer en
> `provider_settings.buffer_minutes`.

---

## Distancia y "Ruta eficiente ✓"

- En S-2 (detalle de solicitud) mostrar distancia desde la cita anterior/siguiente ese
  día, y desde el centroide del cantón base si no hay citas.
- Badge "Ruta eficiente ✓" cuando la solicitud cae en el mismo cantón que citas
  adyacentes. Distancias con Haversine (ver `SKILL_CANTONES_GEO.md`).

---

## Configuración (dónde se prende/apaga)

| Ajuste | Tabla / pantalla |
|--------|------------------|
| Mostrar horarios recomendados | `provider_settings.show_recommended_slots` (SE-3) |
| Descuento por proximidad ON/OFF | `provider_settings.proximity_discount_enabled` (M-1) |
| % de descuento (5/10/15) | `provider_settings.proximity_discount_pct` (M-1) |
| Aceptar solicitudes de un cantón | `provider_cantones.accepts_requests` (M-1) |

---

## Checklist

- [ ] `canton_id` de la cita resuelto por geocoding inverso
- [ ] Slots ⭐ calculados respetando duración + buffer
- [ ] Slots ⭐ mostrados primero al cliente
- [ ] Descuento aplicado solo si `proximity_discount_enabled`
- [ ] Distancias con Haversine y velocidad 30 km/h
- [ ] Respeta `accepts_requests` por cantón
