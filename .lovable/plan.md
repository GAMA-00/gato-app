

## Reordenar elementos del tab "Citas"

Se reorganizará el contenido del tab "Citas" para que los tres elementos (Citas de Hoy, Citas de Mañana, y Contadores) estén en un único contenedor scrolleable, en el orden solicitado.

---

### Cambio a realizar

**Archivo:** `src/components/dashboard/ProviderDashboardTabs.tsx`

**Estructura actual:**
```text
TabsContent "citas"
├── ProviderStatsCards (fijo, fuera del scroll)
└── div scrolleable
    ├── Citas de Hoy
    └── Citas de Mañana
```

**Nueva estructura:**
```text
TabsContent "citas" (scrolleable completo)
├── Citas de Hoy
├── Citas de Mañana
└── ProviderStatsCards (contadores)
```

---

### Cambios específicos

1. **Mover todo a un único contenedor scrolleable** - El `TabsContent` completo tendrá el scroll

2. **Reordenar los componentes:**
   - Primero: `AppointmentList` con "Citas de Hoy"
   - Segundo: `AppointmentList` con "Citas de Mañana"
   - Tercero: `ProviderStatsCards` (contadores)

3. **Ajustar estilos** - Aplicar `overflow-y-auto` y `maxHeight` al contenedor principal

---

### Resultado esperado

Al hacer scroll en el tab "Citas", el usuario verá en orden:
1. Lista de citas de hoy
2. Lista de citas de mañana
3. Franja con los contadores (Esta semana, Clientes, Ingresos)

