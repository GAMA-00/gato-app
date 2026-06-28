# 🟢 Instalar y correr Gato en tu computadora — guía paso a paso

Esta guía es para **alguien sin experiencia en programación**. Seguí los pasos en orden,
copiando y pegando los comandos tal cual. Al final vas a tener la app corriendo en tu
compu y la vas a abrir en el navegador.

> 💻 Escrita para **Mac**. Si usás Windows, pegale esta guía a tu Claude y pedile que
> adapte los comandos a Windows.

---

## 🤖 Para tu Claude (leé esto primero, copiá este bloque a tu Claude)

> Soy un usuario no técnico. Quiero correr este proyecto (Gato, React+Vite+Supabase) en
> local en mi Mac. Guiame ejecutando los pasos de `INSTALACION_LOCAL.md` uno por uno,
> verificando el resultado de cada uno antes de seguir, y resolviendo cualquier error.
> El proyecto usa un **Supabase local** (Docker) y se enciende con `npm run start:local`.
> Contexto técnico completo está en `README.md` y `CLAUDE.md`.

---

## ✅ Qué vas a instalar (solo la primera vez)

1. **Terminal** (ya viene en tu Mac)
2. **Homebrew** — instalador de programas
3. **Node.js** — para correr la app
4. **Docker Desktop** — para la base de datos local
5. **Supabase CLI** — la herramienta de la base de datos
6. **El proyecto Gato** (bajarlo de internet)

Después, encender la app es **un solo comando**.

---

## Paso 1 — Abrir la Terminal

1. Apretá `Cmd` (⌘) + barra espaciadora.
2. Escribí **Terminal** y dale Enter.
3. Se abre una ventana con texto. Ahí vas a pegar los comandos.

> Para **pegar** en la Terminal: `Cmd` + `V`, y luego Enter.

---

## Paso 2 — Instalar Homebrew

Pegá esto y dale Enter (te puede pedir tu contraseña de la Mac — escribila, no se ve
mientras tecleás, es normal):

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Cuando termine, **cerrá y volvé a abrir la Terminal**.

✅ **Verificá** (pegá esto, debe mostrar un número de versión):
```bash
brew --version
```

---

## Paso 3 — Instalar Node.js

```bash
brew install node
```

✅ **Verificá:**
```bash
node --version
```
Debe mostrar algo como `v20.x` o mayor.

---

## Paso 4 — Instalar Docker Desktop

```bash
brew install --cask docker
```

Después:
1. Abrí **Docker** (Cmd+barra → "Docker" → Enter). La primera vez aceptá los permisos.
2. Esperá a que el ícono de la ballena 🐳 (arriba a la derecha) deje de moverse.

> ⚠️ **Importante:** Docker debe estar **abierto** siempre que uses la app. Si lo cerrás,
> la app deja de funcionar. Tip: dejalo abierto.

---

## Paso 5 — Instalar Supabase CLI

```bash
mkdir -p "$HOME/.local/share/supabase"
curl -sL https://github.com/supabase/cli/releases/latest/download/supabase_darwin_arm64.tar.gz | tar -xzf - -C "$HOME/.local/share/supabase"
```

✅ **Verificá:**
```bash
~/.local/share/supabase/supabase --version
```
Debe mostrar un número (ej. `2.106.0`).

> Si tu Mac es vieja (con chip Intel, no Apple Silicon), cambiá `arm64` por `amd64` en el
> comando de arriba.

---

## Paso 6 — Bajar el proyecto

Elegí dónde guardarlo (ej. tu carpeta de Documentos) y clonalo:

```bash
cd ~/Documents
git clone https://github.com/andreyVarela/gato-app.git
cd gato-app
git checkout develop
```

> `git checkout develop` es importante: el trabajo nuevo vive en la rama **develop**.

✅ **Verificá** (debe listar archivos como `README.md`, `package.json`):
```bash
ls
```

---

## Paso 7 — Instalar las dependencias del proyecto (primera vez)

```bash
npm install --legacy-peer-deps
```

Tarda 1–2 minutos. Es normal que salgan algunos *warnings* (avisos amarillos); mientras
no diga **error** en rojo, está bien.

---

## Paso 8 — Encender la app (¡el comando mágico!)

Con Docker abierto, pegá:

```bash
npm run start:local
```

Esto hace **todo solo**: verifica Docker, levanta la base de datos local, carga los datos
de demo la primera vez, configura la conexión, y arranca la app.

La primera vez tarda varios minutos (descarga la base de datos). Cuando veas:

```
➜  Local:   http://localhost:8080/
```

¡Ya está corriendo! **Dejá esa ventana de Terminal abierta** (si la cerrás, se apaga).

---

## Paso 9 — Abrir la app en el navegador

Abrí Chrome o Safari y entrá a:

- **App:** http://localhost:8080
- **Link de reserva de demo:** http://localhost:8080/demo
- **Ver la base de datos (opcional):** http://127.0.0.1:54323

### Cuentas de prueba (contraseña: `gato1234`)
- Proveedor: `demo@gato.app`
- Cliente: `cliente@gato.app`

> Para verlo como **celular**: en Chrome, clic derecho → "Inspeccionar" → apretá el ícono
> de teléfono/tablet (o `Cmd`+`Shift`+`M`).

---

## 🔁 Para volver a usarla otro día

1. Abrí **Docker** y esperá la ballena 🐳.
2. Abrí la Terminal y pegá:
   ```bash
   cd ~/Documents/gato-app
   npm run start:local
   ```
3. Abrí http://localhost:8080

## ⏹️ Para apagarla
- En la ventana de la Terminal donde corre, apretá `Ctrl` + `C`.
- (La base de datos sigue corriendo en Docker; no pasa nada por dejarla.)

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
| Dice **"proveedor no encontrado"** o errores de conexión | Docker se apagó. Abrí Docker, esperá la ballena, y corré `npm run start:local` de nuevo. |
| **"Cannot connect to the Docker daemon"** | Docker no está abierto. Abrilo y esperá ~1 min. |
| **"command not found: npm"** | Faltó el Paso 3 (Node). Reinstalá: `brew install node`. |
| **"command not found: supabase"** | Usá la ruta completa: `~/.local/share/supabase/supabase` (ya está en el script). |
| El navegador no abre la página | Esperá a ver `Local: http://localhost:8080/` en la Terminal; recién ahí abrí el navegador. |
| Un puerto está ocupado (8080 o 54321) | Cerrá otras apps/Terminales corriendo lo mismo, o reiniciá la Mac. |

Si algo no se resuelve: **copiá el texto del error y pegáselo a tu Claude** junto con esta
guía — tiene el contexto para ayudarte.

---

## 📚 Para saber más (opcional)
- `README.md` — visión técnica del proyecto.
- `CLAUDE.md` — contexto y reglas para programar.
- `docs/CONCEPTO_V1.md` — qué hace el producto y por qué.
