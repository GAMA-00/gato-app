# 📋 Índice de Documentación DOE

## 🗺️ Mapas del Proyecto

| Documento | Descripción |
|-----------|-------------|
| [PROJECT_MAP.md](./PROJECT_MAP.md) | Vista de alto nivel del proyecto completo |
| [FRONTEND_MAP.md](./FRONTEND_MAP.md) | Arquitectura y estructura del frontend |
| [BACKEND_MAP.md](./BACKEND_MAP.md) | Edge Functions, DB y servicios externos |
| [GLOSSARY.md](./GLOSSARY.md) | Glosario de términos del proyecto |

---

## 🛠️ Skills (Guías Accionables)

| Skill | Cuándo Usar |
|-------|-------------|
| [SKILL_NEW_FEATURE.md](./skills/SKILL_NEW_FEATURE.md) | Agregar funcionalidad nueva al frontend |
| [SKILL_NEW_EDGE_FUNCTION.md](./skills/SKILL_NEW_EDGE_FUNCTION.md) | Crear nueva Edge Function en Supabase |
| [SKILL_DATABASE_MIGRATION.md](./skills/SKILL_DATABASE_MIGRATION.md) | Modificar esquema de base de datos |
| [SKILL_DEBUG_PAYMENTS.md](./skills/SKILL_DEBUG_PAYMENTS.md) | Diagnosticar problemas de pago |
| [SKILL_RECURRING_APPOINTMENTS.md](./skills/SKILL_RECURRING_APPOINTMENTS.md) | Trabajar con citas recurrentes |
| [SKILL_MODIFY_UI.md](./skills/SKILL_MODIFY_UI.md) | Modificar componentes de UI |

---

## 📁 Estructura de Documentación

```
docs/
├── INDEX.md                          # ← Este archivo
├── PROJECT_MAP.md                    # Mapa general
├── FRONTEND_MAP.md                   # Mapa frontend
├── BACKEND_MAP.md                    # Mapa backend
├── GLOSSARY.md                       # Glosario
│
├── skills/                           # Guías accionables
│   ├── SKILL_NEW_FEATURE.md
│   ├── SKILL_NEW_EDGE_FUNCTION.md
│   ├── SKILL_DATABASE_MIGRATION.md
│   ├── SKILL_DEBUG_PAYMENTS.md
│   ├── SKILL_RECURRING_APPOINTMENTS.md
│   └── SKILL_MODIFY_UI.md
│
└── scripts/                          # Scripts SQL de utilidad
    ├── fix-stuck-payment.sql
    └── fix-stuck-post-payment-payments.sql
```

---

## 🚀 Quick Start para IA

### Para agregar una feature:
1. Leer `PROJECT_MAP.md` para contexto
2. Leer `FRONTEND_MAP.md` o `BACKEND_MAP.md` según aplique
3. Seguir skill correspondiente

### Para debug:
1. Identificar área (payments, appointments, etc.)
2. Leer skill de debug relevante
3. Usar queries SQL proporcionadas

### Para modificar UI:
1. Leer `SKILL_MODIFY_UI.md`
2. Verificar tokens en `index.css`
3. NO cambiar lógica de negocio

---

## 📝 TODOs Globales

- [ ] Agregar diagrama ER completo de la DB
- [ ] Documentar todas las variables de entorno
- [ ] Agregar guía de testing
- [ ] Crear runbooks de incidentes
- [ ] Documentar proceso de deploy
- [ ] Agregar ejemplos de API requests/responses
