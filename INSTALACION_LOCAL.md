# 🟢 Instalar y correr Gato en tu computadora — guía paso a paso

Esta guía es para **alguien sin experiencia en programación**. Seguí los pasos en orden,
copiando y pegando los comandos tal cual. Al final vas a tener la app corriendo en tu
compu y la vas a abrir en el navegador.

> 💻 Escrita para **Mac Apple Silicon (M1/M2/M3/M4)**. Si tenés Mac Intel o Windows,
> pegale esta guía a tu Claude y pedile que adapte los comandos.

---

## 🤖 Para tu Claude (copiá este bloque completo y pegáselo a tu Claude antes de empezar)

> Soy un usuario no técnico. Quiero correr el proyecto **Gato** (React + Vite + Supabase local)
> en mi Mac. El repo está en `~/Documents/gato-app` (rama `develop`).
>
> **Contexto técnico:**
> - PWA mobile-first para proveedores de servicio a domicilio en Costa Rica.
> - Stack: React + Vite + TypeScript + Supabase (Postgres + Auth + Realtime).
> - Base de datos local con Docker + Supabase CLI (`~/.local/share/supabase/supabase`).
> - Un solo comando para encender todo: `npm run start:local` (script `start-local.sh`).
> - El script: verifica Docker, corre `supabase start`, siembra datos demo la primera vez,
>   crea `.env.local` con la anon key automáticamente, y lanza `npm run dev`.
> - Docker Desktop está en `/Applications/Docker.app` (instalado sin Homebrew vía DMG).
>   El binario de Docker está en `/Applications/Docker.app/Contents/Resources/bin/docker`.
>   El `start-local.sh` ya exporta ese PATH automáticamente.
> - Supabase CLI versión 2.108.0 en `~/.local/share/supabase/supabase`.
> - Node v24 ya instalado. Homebrew NO está instalado (y no se necesita).
> - Cuentas demo: `demo@gato.app` / `cliente@gato.app` — contraseña: `gato1234`.
> - Booking link de demo: http://localhost:8080/demo
> - Studio (ver base de datos): http://127.0.0.1:54323
>
> Guiame paso a paso, verificá el resultado de cada comando antes de seguir,
> y resolvé cualquier error. Si algo falla, leé `CLAUDE.md` para más contexto.

---

## ✅ Qué necesitás (ya instalado en esta Mac)

| Herramienta | Estado | Ubicación |
|---|---|---|
| Terminal | ✅ viene con Mac | Cmd+Espacio → "Terminal" |
| Node.js v24 | ✅ instalado | `/usr/local/bin/node` |
| Docker Desktop | ✅ instalado | `/Applications/Docker.app` |
| Supabase CLI v2.108.0 | ✅ instalado | `~/.local/share/supabase/supabase` |
| Proyecto Gato (develop) | ✅ clonado | `~/Documents/gato-app` |

> Si llegás a esta guía en una Mac **nueva** donde no está nada instalado, seguí los
> pasos de instalación más abajo.

---

## Paso 1 — Abrir la Terminal

1. Apretá `Cmd` (⌘) + barra espaciadora.
2. Escribí **Terminal** y dale Enter.
3. Se abre una ventana con texto. Ahí vas a pegar los comandos.

> Para **pegar** en la Terminal: `Cmd` + `V`, y luego Enter.

---

## Paso 2 — Abrir Docker Desktop

Abrí Docker desde la Terminal:

```bash
open /Applications/Docker.app
```

Esperá a que el ícono de la ballena 🐳 (arriba a la derecha en la barra del sistema)
deje de moverse (~1 min la primera vez).

> ⚠️ **Importante:** Docker debe estar **abierto** siempre que uses la app.
> Si lo cerrás, la app deja de funcionar.

---

## Paso 3 — Encender la app (¡el comando mágico!)

```bash
cd ~/Documents/gato-app
npm run start:local
```

Esto hace **todo solo**:
1. Verifica que Docker esté corriendo
2. Levanta la base de datos local (Supabase)
3. Carga los datos de demo (solo la primera vez, tarda ~3 min)
4. Crea el archivo de conexión `.env.local` automáticamente
5. Arranca la app en http://localhost:8080

La **primera vez** tarda varios minutos mientras descarga imágenes de Docker.
Cuando veas:

```
  ➜  Local:   http://localhost:8080/
```

¡Ya está corriendo! **Dejá esa ventana de Terminal abierta** (si la cerrás, se apaga).

---

## Paso 4 — Abrir la app en el navegador

Abrí Chrome o Safari y entrá a:

| URL | Qué es |
|---|---|
| http://localhost:8080 | La app principal |
| http://localhost:8080/demo | Booking link público de la proveedora demo |
| http://127.0.0.1:54323 | Supabase Studio (ver la base de datos) |

### Cuentas de prueba (contraseña: `gato1234`)
- **Proveedor demo:** `demo@gato.app`
- **Cliente demo:** `cliente@gato.app`

> Para verlo como **celular**: en Chrome, clic derecho → "Inspeccionar" →
> apretá el ícono de teléfono/tablet (o `Cmd`+`Shift`+`M`).

---

## 🔁 Para volver a usarla otro día

1. Abrí Docker: `open /Applications/Docker.app` y esperá la ballena 🐳.
2. En la Terminal:
   ```bash
   cd ~/Documents/gato-app
   npm run start:local
   ```
3. Abrí http://localhost:8080

## ⏹️ Para apagarla

- En la ventana de Terminal donde corre la app, apretá `Ctrl` + `C`.
- La base de datos (Supabase) sigue corriendo en Docker; no pasa nada por dejarla.
- Para apagar también Supabase:
  ```bash
  ~/.local/share/supabase/supabase stop
  ```

---

## 🧪 Correr las pruebas (opcional)

```bash
npm test
```

Debe terminar con algo como `18 pasaron, 0 fallaron`.

---

## 🆘 Problemas comunes

| Síntoma | Solución |
|---|---|
| **"proveedor no encontrado"** o errores de conexión | Docker se apagó. Abrí Docker (`open /Applications/Docker.app`), esperá la ballena, y corré `npm run start:local` de nuevo. |
| **"Cannot connect to the Docker daemon"** | Docker no está abierto. Corré `open /Applications/Docker.app` y esperá ~1 min. |
| **"command not found: npm"** o **"command not found: node"** | Node no está instalado. Seguí el Anexo A abajo. |
| **"cannot insert multiple commands"** en Supabase | El Supabase CLI está desactualizado. Corré: `curl -sL https://github.com/supabase/cli/releases/download/v2.108.0/supabase_darwin_arm64.tar.gz \| tar -xzf - -C "$HOME/.local/share/supabase"` |
| El navegador no abre la página | Esperá a ver `Local: http://localhost:8080/` en la Terminal; recién ahí abrí el navegador. |
| Un puerto está ocupado (8080 o 54321) | Cerrá otras Terminales corriendo lo mismo, o reiniciá la Mac. |
| Supabase tarda mucho en arrancar | Normal la primera vez (descarga ~2GB de imágenes Docker). Esperá con paciencia. |
| Error al cargar datos demo | Corré manualmente: `~/.local/share/supabase/supabase db reset` y después `npm run start:local` de nuevo. |

Si algo no se resuelve: **copiá el texto del error y pegáselo a tu Claude** junto con
el contenido de `CLAUDE.md` — tiene el contexto completo para ayudarte.

---

## 📦 Anexo A — Instalación desde cero (Mac nueva)

Solo necesitás esto si vas a instalar en una Mac que no tiene nada:

### A1 — Instalar Node.js
Bajá el instalador desde https://nodejs.org (botón "LTS") e instalalo normalmente.

Verificá:
```bash
node --version   # debe mostrar v20 o mayor
npm --version
```

### A2 — Instalar Docker Desktop

```bash
# Bajarlo e instalarlo (sin Homebrew)
curl -L "https://desktop.docker.com/mac/main/arm64/Docker.dmg" -o /tmp/Docker.dmg
hdiutil attach /tmp/Docker.dmg -nobrowse -quiet
cp -R /Volumes/Docker/Docker.app /Applications/
hdiutil detach /Volumes/Docker -quiet
open /Applications/Docker.app
```

Esperá a que la ballena 🐳 deje de moverse (~2 min).

> Si tu Mac tiene chip Intel (no Apple Silicon), cambiá `arm64` por `amd64` en la URL.

### A3 — Instalar Supabase CLI

```bash
mkdir -p "$HOME/.local/share/supabase"
curl -sL https://github.com/supabase/cli/releases/download/v2.108.0/supabase_darwin_arm64.tar.gz \
  | tar -xzf - -C "$HOME/.local/share/supabase"
```

Verificá:
```bash
~/.local/share/supabase/supabase --version   # debe mostrar 2.108.0
```

### A4 — Clonar el proyecto

```bash
cd ~/Documents
git clone -b develop https://github.com/andreyVarela/gato-app.git
cd gato-app
npm install --legacy-peer-deps
```

Después seguí desde el **Paso 2** de esta guía.

---

## 📚 Para saber más (opcional)
- `README.md` — visión técnica del proyecto.
- `CLAUDE.md` — contexto y reglas para programar con IA.
- `docs/CONCEPTO_V1.md` — qué hace el producto y por qué.
