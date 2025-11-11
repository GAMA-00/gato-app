# Comandos de Verificación PR #1

## 🚀 Verificación Rápida (Recomendado)

Ejecuta el script de validación automatizado:

```bash
chmod +x VALIDACION_PR_1.sh
./VALIDACION_PR_1.sh
```

Este script verifica:
- ✅ Archivos migrados sin console.*
- ✅ Archivos protegidos intactos
- ✅ ESLint pasando
- ✅ Build exitoso
- ✅ Logger.ts correcto
- ✅ ESLint config correcto

---

## 📋 Verificación Manual (Alternativa)

Si prefieres verificar manualmente:

### 1. Verificar archivos migrados (0 console.* esperado)

```bash
# Contexts & Auth
git grep "console\." src/contexts/AuthContext.tsx
git grep "console\." src/contexts/AvailabilityContext.tsx
git grep "console\." src/contexts/UnifiedAvailabilityContext.tsx
git grep "console\." src/contexts/auth/

# Dashboard
git grep "console\." src/components/dashboard/AppointmentCard.tsx
git grep "console\." src/components/dashboard/AppointmentList.tsx
git grep "console\." src/components/dashboard/DashboardErrorState.tsx

# Client
git grep "console\." src/components/client/service/ProviderCertifications.tsx
git grep "console\." src/components/client/service/ProviderInfoCard.tsx

# Provider
git grep "console\." src/components/provider/PostPaymentInvoicing.tsx
git grep "console\." src/components/provider/PostPaymentPricing.tsx

# Pages
git grep "console\." src/pages/Register.tsx
git grep "console\." src/pages/ProviderRegister.tsx
```

**Resultado esperado**: Todos los comandos deben retornar vacío (0 matches).

---

### 2. Verificar archivos protegidos (DO_NOT_CHANGE_BEHAVIOR)

```bash
# Verificar que markers están presentes
git grep "DO_NOT_CHANGE_BEHAVIOR" src/utils/robustBookingSystem.ts
git grep "DO_NOT_CHANGE_BEHAVIOR" src/contexts/AuthContext.tsx
```

**Resultado esperado**: Ambos archivos deben mostrar el comentario DO_NOT_CHANGE_BEHAVIOR.

---

### 3. Ejecutar Lint

```bash
npm run lint
```

**Resultado esperado**: 
```
✔ No ESLint warnings or errors
```

---

### 4. Ejecutar Build

```bash
npm run build
```

**Resultado esperado**: 
```
✔ Build completed successfully
```

---

### 5. Verificar logger.ts

```bash
# Verificar que existe
ls -la src/utils/logger.ts

# Verificar que contiene console.* (debe tenerlo para implementación)
git grep "console\." src/utils/logger.ts

# Verificar que tiene excepción en ESLint
git grep -A 5 "logger.ts" eslint.config.js
```

**Resultado esperado**:
- Archivo existe
- Contiene console.log, console.error, etc.
- ESLint config tiene excepción para logger.ts

---

### 6. Verificar ESLint config

```bash
# Ver regla no-console
git grep -A 2 "no-console" eslint.config.js
```

**Resultado esperado**:
```javascript
"no-console": ["error", { "allow": [] }],
```

Y excepción:
```javascript
{
  files: ["src/utils/logger.ts"],
  rules: {
    "no-console": "off",
  }
}
```

---

## 🧪 Smoke Tests Manuales

### Test 1: Login
1. Abrir app en navegador
2. Ir a /login
3. Ingresar credenciales
4. **Verificar**: Login exitoso, sin errores en console

### Test 2: Dashboard
1. Después de login, ir a /dashboard
2. **Verificar**: Dashboard carga correctamente
3. **Verificar**: Citas se muestran
4. **Verificar**: Sin errores en console

### Test 3: Crear Cita
1. Navegar a crear nueva cita
2. Seleccionar servicio, fecha, hora
3. Confirmar cita
4. **Verificar**: Cita creada exitosamente
5. **Verificar**: Sin errores en console

### Test 4: Ver Calendario
1. Navegar a /calendar
2. **Verificar**: Calendario renderiza correctamente
3. **Verificar**: Citas aparecen en calendario
4. **Verificar**: Sin errores en console

---

## 📊 Estadísticas (Informativo)

### Contar console.* restantes en proyecto

```bash
# Total en src/ (excluyendo logger.ts)
git grep -n "console\." src/ | grep -v "logger.ts" | wc -l

# Por directorio
git grep -c "console\." src/hooks/ | grep -v ":0$"
git grep -c "console\." src/utils/ | grep -v ":0$"
git grep -c "console\." src/components/ | grep -v ":0$"
```

**Nota**: Estos console.* restantes serán migrados en PR #1.5.

---

## ✅ Checklist de Aprobación

Antes de aprobar PR #1, verificar:

- [ ] ✅ Script VALIDACION_PR_1.sh pasa (o todas verificaciones manuales)
- [ ] ✅ 15 archivos migrados sin console.*
- [ ] ✅ DO_NOT_CHANGE_BEHAVIOR intactos
- [ ] ✅ `npm run lint` pasa
- [ ] ✅ `npm run build` exitoso
- [ ] ✅ Smoke tests pasando (login, dashboard, crear cita, calendario)
- [ ] ✅ Console limpia en DevTools (sin errores ni logs sueltos)
- [ ] ✅ Logger.ts correcto
- [ ] ✅ ESLint config correcto

---

## 🚀 Post-Merge

Después de aprobar y mergear PR #1:

```bash
# 1. Crear issue para PR #1.5
# (Usar contenido de ISSUE_PR_1.5_TRACKING.md)

# 2. Iniciar PR #2 - LoadingScreen
git checkout -b feature/pr2-loading-screen

# 3. Iniciar PR #3 - Query Invalidation
git checkout -b feature/pr3-query-invalidation
```

---

## 📁 Archivos de Referencia

- **PR_1_REPORTE_FINAL.md**: Reporte técnico completo
- **PR_1_ENTREGABLE_FINAL.md**: Resumen ejecutivo
- **PR_1.5_LOGGING_BACKLOG.md**: Lista de archivos pendientes
- **ISSUE_PR_1.5_TRACKING.md**: Issue para tracking PR #1.5
- **VALIDACION_PR_1.sh**: Script de validación automatizado
- **COMANDOS_VERIFICACION.md**: Este archivo

---

**Última actualización**: 2025-01-XX  
**Estado PR #1**: ✅ Ready for Review
