
# Plan: Actualizar Tema Visual de la App "Gato"

## Resumen
Actualizar el tema de toda la aplicacion usando la nueva paleta de colores "Coral Gato" mostrada en las imagenes de referencia, manteniendo un aspecto limpio, minimalista y funcional. Los cambios son puramente visuales, sin afectar la logica o funcionalidad.

---

## Nueva Paleta de Colores

| Nombre | Hex | Uso |
|--------|-----|-----|
| Coral Gato (Principal) | `#de7153` | Botones principales, acentos, iconos activos |
| Coral Claro | `#D58870` | Variante hover, estados alternativos |
| Marron | `#773E2D` | Texto en fondos claros, contrastes |
| Gris Claro | `#E5E5E5` | Fondos de tarjetas, separadores |
| Gris Oscuro | `#333333` | Texto principal |
| Negro Suave | `#1C1A19` | Texto de alta importancia, titulos |
| Blanco Suave | `#F9F9F9` | Fondo de la app |

---

## Cambios por Archivo

### 1. Variables CSS Globales
**Archivo:** `src/index.css`

Actualizar las variables CSS para reflejar la nueva paleta:
- `--primary`: Cambiar de coral `#FF6B5A` a `#de7153` (HSL: 10 68% 60%)
- `--foreground`: Mantener texto oscuro `#1C1A19`
- `--background`: Cambiar a `#F9F9F9` (blanco suave)
- `--card`: Cambiar a `#F5F5F5` (ligeramente mas oscuro que fondo)

### 2. Configuracion de Tailwind
**Archivo:** `tailwind.config.ts`

Actualizar los colores personalizados:
- `app.background`: `#F9F9F9`
- `app.text`: `#1C1A19`
- Agregar colores coral: `coral: { DEFAULT: '#de7153', light: '#D58870', dark: '#773E2D' }`
- Agregar gradiente coral: `gradient-coral`

### 3. Pagina de Inicio (Landing)
**Archivo:** `src/pages/LandingPage.tsx`

- Cambiar boton "Ingresar como Cliente" de `bg-black` a `bg-[#de7153]` (coral)
- Mantener boton "Ingresar como Proveedor" con borde y fondo blanco
- Actualizar iconos a usar color coral para consistencia
- Logo ya existe, confirmar que muestra el logo de Gato correcto

### 4. Paginas de Login
**Archivos:**
- `src/pages/ClientLogin.tsx`
- `src/pages/ProviderLogin.tsx`

- Cambiar boton de submit de `bg-black` a `bg-[#de7153]`
- Actualizar color de hover a `#D58870`
- Mantener consistencia con el tema coral

### 5. Formulario de Registro
**Archivo:** `src/components/auth/RegisterForm.tsx`

- Cambiar botones de `bg-navy` a `bg-[#de7153]`
- Actualizar hover de `bg-navy-hover` a coral mas oscuro
- Actualizar enlaces de `text-navy` a `text-[#de7153]`

### 6. Componente de Boton Base
**Archivo:** `src/components/ui/button.tsx`

Actualizar la variante `default`:
- De `bg-app-text` a `bg-[#de7153]`
- Hover: `hover:bg-[#D58870]`

### 7. Navegacion
**Archivos:**
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/components/layout/DesktopNav.tsx`

- Iconos activos: Cambiar de `text-primary` a usar el nuevo color coral
- Mantener iconos inactivos en gris `#4D4D4D`

### 8. Otros Componentes con Colores
**Archivos a revisar:**
- `src/components/services/steps/SlotCard.tsx`: Cambiar slots seleccionados de negro a coral
- `src/components/calendar/AvailabilityManager.tsx`: Tabs activos usar coral
- `src/components/client/results/ServiceVariantsSelector.tsx`: Indicador de scroll usar coral

---

## Resumen de Archivos a Modificar

1. `src/index.css` - Variables CSS globales
2. `tailwind.config.ts` - Configuracion de colores Tailwind
3. `src/pages/LandingPage.tsx` - Pagina de inicio
4. `src/pages/ClientLogin.tsx` - Login de clientes
5. `src/pages/ProviderLogin.tsx` - Login de proveedores
6. `src/components/auth/RegisterForm.tsx` - Formulario de registro
7. `src/components/ui/button.tsx` - Componente de boton base
8. `src/components/layout/MobileBottomNav.tsx` - Navegacion inferior
9. `src/components/services/steps/SlotCard.tsx` - Tarjetas de slots

---

## Detalles Tecnicos

### Conversion de Colores a HSL

| Hex | HSL |
|-----|-----|
| `#de7153` | 10 68% 60% |
| `#D58870` | 16 55% 64% |
| `#773E2D` | 13 47% 32% |
| `#F9F9F9` | 0 0% 98% |
| `#1C1A19` | 20 6% 10% |

### Gradiente Coral
```css
linear-gradient(135deg, #de7153 0%, #D58870 100%)
```

---

## Notas Importantes

- No se modifica ninguna logica de negocio
- Se mantiene la estructura de componentes existente
- Los colores se actualizan de forma centralizada via CSS variables cuando es posible
- Los colores hardcodeados en clases individuales se actualizan directamente
- El logo existente en `/lovable-uploads/` se mantiene

