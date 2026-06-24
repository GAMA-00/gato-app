# Gato SaaS — Especificación de Producto v1

> Spec de producto canónico (tal como lo entregó producto). El esquema técnico de
> implementación y el análisis de brecha viven en [CONCEPTO_V1.md](./CONCEPTO_V1.md).
>
> **Mercado:** Proveedores de servicio a domicilio independientes, Costa Rica ·
> **Usuario primario:** Proveedor con 10–40 clientes activos.

**Filosofía de diseño:** Minimalismo funcional. Cada pantalla tiene una sola acción
principal. Si la señora de limpieza no lo entiende sola en 10 segundos, se rediseña.

---

## Principios de diseño no negociables

1. **Máximo 3 taps para cualquier acción crítica** (aceptar cita, bloquear horario, compartir link)
2. **Texto + ícono siempre** — nunca íconos solos
3. **Botones grandes** — mínimo 48px de altura, texto legible sin zoom
4. **Español costarricense** — "Tuanis" no, pero tampoco tecnicismos. "Agenda" no "Calendario de disponibilidad"
5. **Confirmación antes de cualquier acción destructiva** — cancelar, rechazar, eliminar
6. **Estado vacío siempre útil** — si no hay citas, mostrar "Comparte tu link" en lugar de una pantalla en blanco
7. **Carga optimista** — la UI responde inmediatamente, sincroniza después
8. **Sin formularios largos** — máximo 4 campos por pantalla, nunca más

---

## Arquitectura de navegación

```
LANDING (gato.app)
├── [Botón] Soy Proveedor → Onboarding / Login proveedor
└── [Botón] Soy Cliente → Login / Registro cliente → Directorio Gato

App Web Proveedor (autenticado)
├── ONBOARDING (7 pasos, solo primera vez)
└── APP PRINCIPAL
    ├── [Tab 1] Inicio
    ├── [Tab 2] Agenda ← incluye Google Calendar sync
    ├── [Tab 3] Servicio
    └── [Tab 4] Mapa

App Web Cliente (autenticado)
├── ONBOARDING CLIENTE (2 pasos, solo primera vez)
└── Directorio Gato
    ├── Búsqueda y filtros
    └── Perfil del proveedor → Booking Link

Booking Link (público, sin login)
├── BL-1: Perfil del proveedor
└── Flujo de reserva (5 pasos)
```

---

## SECCIÓN 0: LANDING PAGE

### Pantalla L-1: Landing principal (gato.app)
- Logo Gato centrado (grande)
- Tagline breve: *"Tu negocio, más ordenado"*
- Dos botones grandes, apilados verticalmente:
  - Botón primario: **"Soy Proveedor"** → login/onboarding del proveedor
  - Botón secundario (outlined): **"Soy Cliente"** → login/registro del cliente (CO-1)
- Sin texto adicional, sin scroll en mobile — todo visible en una pantalla

---

## SECCIÓN 0B: ONBOARDING CLIENTE

### Pantalla CO-1: Login / Registro cliente
- Logo Gato pequeño en el header
- Título: *"Entrá a tu cuenta"*
- Campo: Correo electrónico
- Campo: Contraseña (con toggle mostrar/ocultar)
- Botón primario: **"Ingresar"**
- Separador: "¿No tenés cuenta?"
- Botón secundario: **"Crear cuenta"** → CO-2
- Link pequeño: "Olvidé mi contraseña" → flujo de recuperación por correo

**Lógica de recuperación:** Envío de link de reseteo al correo registrado. Flujo
estándar de email.

### Pantalla CO-2: Registro cliente
- Título: *"Creá tu cuenta"*
- Campos: Nombre completo · Correo · Contraseña (mín. 8, con indicador de fortaleza) · Confirmar contraseña
- Checkbox: "Acepto los términos y condiciones" (obligatorio, link al documento)
- Botón: **"Crear cuenta"**
- Link pequeño: "Ya tengo cuenta — Ingresar" → CO-1

**Al crear la cuenta:** envía correo de verificación. El cliente puede usar la app
inmediatamente pero ve un banner hasta verificar. **Tras registro/login exitoso:**
redirige al Directorio Gato (D-1).

---

## SECCIÓN 1: ONBOARDING (PROVEEDOR)

### Pantalla O-1: Bienvenida / Login proveedor
- Logo Gato
- Título: *"Ingresá con tu WhatsApp"*
- Subtítulo: *"Te enviamos un código para entrar — sin contraseña"*
- Campo: Número de WhatsApp (selector de país, default CR +506)
- Botón: **"Enviar código"**
- Link pequeño: "¿Primera vez? Tu cuenta se crea automáticamente"

**Lógica:** Login por OTP vía WhatsApp Business de Gato. Sin contraseñas. Código de 6
dígitos. Si es cuenta nueva → onboarding. Si ya existe → Tab Inicio.

### Pantalla O-2: Registro básico
- Título: *"Cuéntanos sobre vos"*
- Campos: Nombre completo (o del negocio) · Número de WhatsApp (pre-llenado del OTP)
- Selector: Tipo de servicio principal (Limpieza del hogar · Fisioterapia/masajes · Lavado de carros · Belleza a domicilio · Jardinería · Otro)
- Botón: **"Siguiente →"**
- Sin foto de perfil aquí (se pide después para reducir fricción).

### Pantalla O-3: Tu cantón de residencia
- Título: *"¿En qué cantón vivís?"*
- Subtítulo: *"Usamos esto para calcular distancias desde tu zona — no publicamos tu dirección exacta"*
- Selector jerárquico en dos pasos: Provincia (dropdown) → Cantón (según provincia)
- Botón: **"Siguiente →"**

**Seguridad:** Se almacena el **centroide geográfico** del cantón, no la dirección.
Las distancias se calculan desde ese punto central cuando no hay otras citas de
referencia ese día. El proveedor nunca expone su domicilio exacto.

### Pantalla O-4: Tu catálogo de servicios
- Título: *"¿Qué servicios ofrecés?"* · Subtítulo: *"Agregá al menos uno para continuar"*
- Lista de servicios (vacía al inicio)
- Botón **"+ Agregar servicio"** → modal: Nombre · Precio (₡ o $, toggle) · Duración (bloques de 30 min: 30min…4h, más de 4h) · Guardar
- Botón **"Siguiente →"** (activo solo con ≥1 servicio)

**Pre-llenado inteligente:** "Limpieza del hogar" → "Limpieza general – ₡25,000 – 3h";
"Fisioterapia" → "Sesión de fisioterapia – ₡35,000 – 1h". Editable/borrable.

### Pantalla O-5: Tu disponibilidad
- Título: *"¿Cuándo trabajás normalmente?"* · Subtítulo: *"Podés cambiarlo en cualquier momento"*
- 7 rows (Lun–Dom): Toggle ON/OFF + selector hora inicio/fin
- Default: Lun–Vie activos, 8am–6pm
- Botón: **"Siguiente →"**

**Lógica de slots:** Horario dividido en slots de 30 min. Al agendar se bloquean los
slots necesarios + 1 slot (30 min) de **buffer de traslado**. Buffer configurable en
ajustes, activo por default.

### Pantalla O-6: Tus zonas de trabajo (opcional)
- Título: *"¿En qué zonas trabajás?"* · Subtítulo: *"Ayuda a que clientes cercanos te encuentren más fácil"*
- Selector jerárquico: Provincia (chips horizontales) → cantones con checkboxes
  - Opción "Seleccionar toda la provincia" o cantones individuales
  - Seleccionados aparecen como tags removibles
- Link: "Saltar por ahora" · Botón: **"Siguiente →"**

**Datos:** Catálogo completo de 7 provincias y 84 cantones precargado. Sin texto libre.

### Pantalla O-7: ¡Todo listo!
- Animación de check verde (Lottie, ~1.5s)
- Título: *"¡Tu cuenta está lista!"*
- Tu link de reserva: `gato.app/tu-nombre`
- Botón primario **"Compartir por WhatsApp"** (mensaje pre-escrito)
- Botón secundario **"Copiar link"** · Link "Ver mi agenda →"

**Nota:** El slug se genera del nombre. Si existe, agrega número. No editable en v1.

---

## SECCIÓN 2: APP PRINCIPAL — TAB 1: INICIO (H-1, H-2)

### H-1: Vista de inicio
**Header:** Saludo dinámico "Buenos días/tardes, [Nombre]" · fecha humana ("Martes 10
de junio") · campana de notificaciones (badge si hay no leídas).

**Bloque 1 — Solicitudes de reserva (PRIORIDAD):** Título "Solicitudes nuevas" + badge.
Cards con nombre, servicio, fecha/hora, cantón, distancia estimada, botones ✓ Aceptar |
✗ Rechazar. Si no hay: "Sin solicitudes nuevas · Todo al día" (compacto). "Ver todas" → S-1.

**Bloque 2 — Citas de hoy:** Título "Hoy" + número. Lista de cards. Si no hay: "No
tenés citas hoy" + botón destacado "Compartir tu link".
*Card de cita:* hora (grande/bold) · cliente · servicio · pin+cantón · ícono de ciclo si
recurrente · color izquierdo según cantón/zona.

**Bloque 3 — Estadísticas de la semana:** Título "Esta semana" (compacto). Grid 2-3
columnas: 📅 Citas agendadas · 💰 Ganancias estimadas · 🔄 Clientes recurrentes ·
🆕 Clientes nuevos · 🚗 Tiempo en traslados. Tap → SE-5.
*Tiempo en traslados = suma de distancias entre citas consecutivas, a 30 km/h.*

### H-2: Detalle de cita (sheet desde abajo)
- Nombre (grande) · foto/avatar · servicio (nombre+duración+precio) · fecha y hora ·
  dirección completa + cantón · botón "Abrir en Google Maps" · notas del cliente ·
  si recurrente: "Parte del plan: cada 2 semanas · 3 de 8 completadas"
- Botón primario **"Contactar por WhatsApp"** · Botón secundario (rojo) **"Cancelar cita"**

**El proveedor NO puede reagendar.** Solo el cliente desde el booking link.

**Al Cancelar:** (1) confirmación "¿Cancelar esta cita con [nombre]? No podrás
deshacerlo." (2) motivo opcional (Emergencia personal / Error en el horario / Cliente
no respondió / Otro) (3) al confirmar: se cancela, se liberan slots, se notifica al
cliente por WhatsApp con link para reagendar (servicio y fecha pre-seleccionados cuando
sea posible).

---

## SECCIÓN 3: APP PRINCIPAL — TAB 2: AGENDA (A-1…A-5)

### A-1: Vista semanal (default)
**Header:** semana actual ("2–8 Jun") · flechas < > · botón "Hoy" · toggle "Vista
normal"/"Vista por cantones" · botón "Google Calendar" → A-5.

**Grid:** 7 columnas (días) × filas de slots de 30 min (solo dentro de disponibilidad).
Colores: 🟢 disponible · 🔵 cita · 🟡 buffer · ⬛ bloqueado/fuera · 🟠 solicitud
pendiente · ⭐ recomendado (mismo cantón que cita existente).
- Tap azul → H-2 · Tap verde → "Bloquear" | "Crear cita manual" · Tap naranja → S-2 ·
  Tap estrella → tooltip "Horario recomendado — hay otra cita en este cantón".

**Lógica:** slot=30min. Servicio 2h = 4 slots + 1 buffer. Buffer amarillo, automático,
configurable (por día o global). **Mobile:** colapsa a 3 días con scroll horizontal.

### A-2: Crear cita manual (sheet)
Campos: Cliente (buscar existente o nuevo: nombre+WhatsApp) · Servicio (dropdown) ·
Fecha/hora (pre-llenado con slot tocado) · Notas (opcional) · Precio (pre-llenado,
editable) · Botón **"Crear cita"**.

### A-3: Editar disponibilidad
- Sección Horario habitual (interfaz de O-5, editable)
- Sección Buffer de traslado: toggle ON/OFF (default ON) + duración (30min/1h, default 30)
- Sección Bloquear fechas: selector de fecha/rango + motivo (vacaciones/feriado/otro) +
  "Agregar bloqueo" + lista de bloqueos con eliminar
- Botón fijo **"Guardar cambios"**

### A-4: Vista por cantones (toggle)
Misma grid con recomendación por cantón activa.
**Lógica:** cliente fija ubicación en booking link → geocoding inverso → cantón. Si ese
día ya hay cita activa en el mismo cantón: el slot inmediatamente **anterior** y
**posterior** se marcan ⭐; al cliente se le muestran con "Horario recomendado — el
proveedor ya estará en tu zona".
**Vista del proveedor:** leyenda de cantones con color · cada cita con su cantón/color ·
slots ⭐ con estrella · tooltip con cantón + distancia desde cita anterior.

### A-5: Google Calendar
**Desconectado:** ilustración · "Sincronizá con Google Calendar" · descripción · botón
"Conectar Google Calendar" (OAuth).
**Conectado:** badge verde "Conectado · correo" · toggle sync ON/OFF · "Última
sincronización: hace 3 minutos" · botón "Desconectar".

---

## SECCIÓN 4: APP PRINCIPAL — TAB 3: SOLICITUDES (S-1, S-2)

### S-1: Lista de solicitudes
**Si no hay:** "Todo al día · Sin solicitudes nuevas" + "Cuando alguien agende por tu
link, aparecerá aquí".
**Si hay:** cards con nombre · servicio · fecha/hora · cantón · indicador de proximidad
("Mismo cantón que cita del martes", badge verde) · distancia estimada · precio de
catálogo · tiempo transcurrido ("Hace 20 minutos") · botones **✓ Aceptar | ✗ Rechazar**.
- **Aceptar:** agenda con slots + buffer, notifica al cliente por WhatsApp.
- **Rechazar:** pide motivo (No tengo disponibilidad / Zona muy lejos / Ya tengo otra
  cita / Otro) → notifica al cliente.
- **Tab secundario "Historial":** solicitudes de últimos 30 días con estado.

### S-2: Detalle de solicitud (sheet, abre al tocar la card)
- Nombre + WhatsApp · "Cliente nuevo" o "Ha agendado X veces" · servicio(s) con precios
  · fecha/hora preferida · notas · cantón · mapa pequeño con pin
- Distancias: desde centroide del cantón del proveedor (si no hay citas), desde cita
  anterior/siguiente ese día · badge "Ruta eficiente ✓" si mismo cantón que citas adyacentes
- Precio total estimado
- Botones: **"✓ Aceptar solicitud"** · **"✗ Rechazar"** · "Proponer otra hora"
  (contraoferta: selector de fecha/hora → notifica al cliente con link para confirmar).

---

## SECCIÓN 5: APP PRINCIPAL — TAB 4: SERVICIO (SE-1…SE-6)
*(Anteriormente "Yo".)*

### SE-1: Menú principal
**Perfil (top):** foto (tap para cambiar) · nombre + tipo · link `gato.app/tu-nombre`
con copiar · "Ver mi perfil público".
**Secciones:** 1) Mi catálogo → SE-2 · 2) Mi disponibilidad → A-3 · 3) Mis cantones de
trabajo → SE-3 · 4) Recordatorios automáticos → SE-4 · 5) Mis estadísticas → SE-5 ·
6) Mi suscripción → SE-6 · 7) Cerrar sesión.

### SE-2: Mi catálogo
Lista con nombre/precio/duración · toggle activo/inactivo por servicio · tap → editar ·
botón fijo **"+ Agregar servicio"**.

### SE-3: Mis cantones de trabajo
- Selector jerárquico igual a O-6 (editable) · cantones activos como chips por provincia
- Por cantón/provincia: días preferidos (ej: Escazú → Lunes y Martes)
- Toggle global "Mostrar horarios recomendados por cantón" ON/OFF
- **Cantón de residencia:** muestra "Tu cantón base: [cantón]" · botón "Cambiar cantón
  base" (solo cantón, nunca dirección) · nota sobre cálculo de distancias desde el centro.

### SE-4: Recordatorios automáticos
- Título *"Recordatorios a tus clientes"* · "Se envían desde el WhatsApp Business de Gato"
- Toggle "Recordatorio 24 horas antes" ON/OFF
- Toggle "Recordatorio 2 horas antes" ON/OFF
- Mensaje de muestra (no editable en v1).

### SE-5: Mis estadísticas
**Período:** Esta semana · Este mes · Últimos 3 meses.
**Métricas:** citas completadas · canceladas (por proveedor/cliente) · ganancias
estimadas totales · recurrentes vs nuevos · tiempo en traslados · cantón con más citas
(top 3) · horario más solicitado. **Abajo:** últimas 20 citas (cliente, servicio, monto,
estado).

### SE-6: Mi suscripción
Plan actual "Gato Pro · ₡9,990/mes" · próxima facturación · método de pago · botones
"Cambiar método de pago" | "Cancelar suscripción" · opción anual "₡99,900/año".

---

## SECCIÓN 6: APP PRINCIPAL — TAB 5 (FLOTANTE): MAPA (M-1)

- Mapa de CR centrado en la zona del proveedor
- Pins de citas del día (o semana, toggle) con color por cantón
- Pin especial (casa) en el centroide del cantón base
- Líneas de ruta entre citas del día · panel inferior deslizable con citas ordenadas por
  hora + distancia entre cada una · selector de día (hoy/mañana/esta semana)

**Preferencias por cantón (tap en cantón → panel lateral):** nombre · estado
(Activo/Fuera de tu zona) · toggle "Aceptar solicitudes de este cantón" · días
preferidos · número de citas históricas.

**Descuento por proximidad (config aquí):** toggle "Ofrecer descuento en horarios
recomendados" ON/OFF · si activo: % (5/10/15) · descuento automático al agendar en
horario recomendado.

---

## SECCIÓN 7: BOOKING LINK (Público, sin login) — `gato.app/[nombre]`

### BL-1: Perfil del proveedor
Foto (grande, circular) · nombre/negocio · tipo + cantones · descripción breve ·
calificación ★ + nº reseñas (v1 curado manual) · lista de servicios con precio/duración
· botón primario grande **"Agendar una cita"**.
*Sin botón de WhatsApp — el booking link es el canal de conversión.*

### BL-2: ¿Dónde te encuentro?
**Paso 1 (GPS obligatorio):** "¿Dónde necesitás el servicio?" · botón **"📍 Usar mi
ubicación actual"** → permiso GPS · muestra mapa con pin + calle · "¿Es aquí?" Sí/Ajustar.
Si niega GPS: buscador con autocompletado (Google Places).
**Paso 2 (detalles, tras confirmar GPS):** Número de casa/apto (obligatorio) · Color o
señas (obligatorio) · Referencias (opcional) · Botón "Siguiente →".
**Backend:** geocoding inverso de la coordenada → cantón del cliente (usado para
recomendaciones y badge de ruta eficiente).

### BL-3: ¿Qué necesitás?
Lista de servicios (card: nombre, duración, precio) · selección múltiple (tap =
checkmark) · campo "Algo adicional que deba saber" (opcional, máx 200) · "Siguiente →".

### BL-4: Elegí tu fecha y hora
Calendar mensual: disponibles (blanco) · no disponibles (gris) · con slots recomendados
(⭐ verde, tooltip "horario eficiente"). Al elegir día: chips de slots de 30 min;
recomendados primero y destacados, con precio con descuento si aplica
("9:00 AM ⭐ ₡22,500 — 10% desc."). "Siguiente →".

### BL-5: Tus datos
Nombre completo · WhatsApp (CR) · checkbox "Quiero recibir confirmación y recordatorio
por WhatsApp" (default checked) · resumen arriba (servicio·fecha·hora·precio) · botón
**"Enviar solicitud"**.

### BL-6: Confirmación
Animación check · *"¡Solicitud enviada!"* · "[Proveedor] revisará tu solicitud y te
confirmará por WhatsApp de Gato" · resumen (servicio·fecha·hora·dirección·precio) ·
botón "Agregar a mi calendario" (.ics) · "Volver al perfil".

---

## SECCIÓN 8: DIRECTORIO GATO (Clientes autenticados)

Cliente siempre autenticado para navegar/agendar. Nombre y correo quedan vinculados a
las reservas.

### D-1: Home del directorio
Header: logo + búsqueda "¿Qué servicio buscás?" · chips de filtro horizontal (Todos ·
Limpieza · Fisioterapia · Belleza · Lavado de carros · Jardinería · Más…) · filtro de
ubicación (con permiso: "Proveedores cerca de vos · [cantón]"; sin permiso: selector de
cantón). Cards de proveedor: foto · nombre · tipo · ★ + nº reseñas · cantones · "Precio
desde ₡X,000" · distancia al cantón del cliente.

### D-2: Perfil del proveedor (desde directorio)
Como BL-1 + sección de reseñas: calificación grande (★ 4.8) · distribución de estrellas
· últimas 5 reseñas. *v1: reseñas curadas manual o importadas de Google Maps. Reseñas
automáticas post-cita → v2.*

---

## SECCIÓN 9: NOTIFICACIONES

**Canal único al cliente: WhatsApp Business de Gato.** El proveedor nunca expone su
número personal. El cliente puede responder; el sistema lo registra y reenvía al
proveedor como notificación en la app.

**Al proveedor (push PWA + in-app):** nueva solicitud · solicitud aceptada · cita
cancelada por cliente · recordatorio de cita mañana.

**Al cliente (WhatsApp):**
- **Solicitud recibida:** "Hola [nombre], recibimos tu solicitud de cita con [proveedor] para el [fecha]. Te confirmamos pronto."
- **Cita confirmada:** "¡Cita confirmada! [Proveedor] te atenderá el [fecha] a las [hora]. Dirección: [dirección]. Precio estimado: ₡X,000."
- **Recordatorio 24h:** "Recordatorio: mañana a las [hora] tenés cita con [proveedor]. ¿Tenés alguna duda? Respondé este mensaje."
- **Recordatorio 2h (opcional):** "Tu cita con [proveedor] es en 2 horas." (link de maps a la dirección del cliente es solo referencia del proveedor — no se envía al cliente)
- **Cancelación por proveedor:** "Tu cita con [proveedor] para el [fecha] fue cancelada. Podés reagendar aquí: gato.app/[proveedor]"

---

## SECCIÓN 10: LO QUE NO VA EN V1

- Procesamiento de pagos dentro de la plataforma
- Sistema automático de reseñas post-servicio
- Paquetes y planes prepagados
- Reportes y exportación de datos
- Gestión de múltiples empleados bajo un mismo negocio
- App nativa iOS/Android (se lanza como PWA primero)
- Chat interno dentro de la plataforma
- Facturación electrónica
- Múltiples idiomas

---

## SECCIÓN 11: PRECIO

**Gato Pro · ₡9,990 / mes** (único plan al lanzamiento).
- **Anual:** ₡99,900/año (≈10 meses, ahorro ~17%).
- **Prueba: 14 días gratis** — requiere tarjeta al registrarse (reduce cuentas fantasma).
- **No freemium en v1.**

**Punto de equilibrio:** costo operativo ~$800–1,200/mes → ~50–60 suscriptores. Meta 6
meses: 100 (~$2,000 MRR). Meta 12 meses: 300 (~$6,000 MRR).

---

## RESUMEN DE PANTALLAS (34 vistas)

L-1 · CO-1 · CO-2 · O-1…O-7 · H-1 · H-2 · A-1…A-5 · S-1 · S-2 · SE-1…SE-6 · M-1 ·
BL-1…BL-6 · D-1 · D-2.

*Documento de producto · v1.1 · Junio 2026 · uso interno de Gato.*
