# 🛠️ Skill: Crear Migración de Base de Datos

## Contexto

Esta skill te guía para crear migraciones seguras en la base de datos de Supabase.

---

## Pre-requisitos

- [ ] Entender qué cambio se necesita
- [ ] Verificar que no rompa datos existentes
- [ ] Tener backup o plan de rollback

---

## Tipos de Migraciones

### 1. Agregar columna (seguro)

```sql
-- Agregar columna nullable (no rompe nada)
ALTER TABLE public.mi_tabla
ADD COLUMN nueva_columna TEXT;

-- Agregar con default (seguro)
ALTER TABLE public.mi_tabla
ADD COLUMN activo BOOLEAN DEFAULT true;
```

### 2. Agregar tabla nueva

```sql
-- Crear tabla
CREATE TABLE public.mi_nueva_tabla (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nombre TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.mi_nueva_tabla ENABLE ROW LEVEL SECURITY;

-- Políticas básicas
CREATE POLICY "Users can view own data"
ON public.mi_nueva_tabla
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
ON public.mi_nueva_tabla
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
ON public.mi_nueva_tabla
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_mi_nueva_tabla_updated_at
BEFORE UPDATE ON public.mi_nueva_tabla
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

### 3. Modificar columna (⚠️ cuidado)

```sql
-- Cambiar tipo (puede fallar si hay datos incompatibles)
ALTER TABLE public.mi_tabla
ALTER COLUMN mi_columna TYPE INTEGER USING mi_columna::INTEGER;

-- Agregar NOT NULL (solo si no hay nulls)
ALTER TABLE public.mi_tabla
ALTER COLUMN mi_columna SET NOT NULL;
```

### 4. Eliminar columna (⚠️ destructivo)

```sql
-- ANTES: Verificar que no hay datos importantes
SELECT COUNT(*) FROM public.mi_tabla WHERE mi_columna IS NOT NULL;

-- Si es seguro:
ALTER TABLE public.mi_tabla
DROP COLUMN mi_columna;
```

### 5. Agregar índice

```sql
-- Índice simple
CREATE INDEX idx_mi_tabla_columna
ON public.mi_tabla(columna);

-- Índice único
CREATE UNIQUE INDEX idx_mi_tabla_email_unique
ON public.mi_tabla(email);

-- Índice parcial
CREATE INDEX idx_appointments_pending
ON public.appointments(status)
WHERE status = 'pending';
```

---

## Políticas RLS Comunes

### Solo el propietario

```sql
CREATE POLICY "Owner only"
ON public.mi_tabla
FOR ALL
USING (auth.uid() = user_id);
```

### Proveedores ven sus datos + admins

```sql
CREATE POLICY "Provider or admin"
ON public.mi_tabla
FOR SELECT
USING (
  auth.uid() = provider_id
  OR has_role(auth.uid(), 'admin')
);
```

### Lectura pública, escritura autenticada

```sql
CREATE POLICY "Public read"
ON public.mi_tabla
FOR SELECT
USING (true);

CREATE POLICY "Authenticated write"
ON public.mi_tabla
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

---

## Funciones Útiles

### Función has_role

```sql
-- Ya existe en el proyecto
SELECT has_role(auth.uid(), 'admin');
```

### Trigger updated_at

```sql
-- Ya existe: update_updated_at_column()
```

---

## Verificación Post-Migración

```sql
-- 1. Verificar estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mi_tabla';

-- 2. Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'mi_tabla';

-- 3. Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'mi_tabla';
```

---

## Rollback Patterns

### Si agregaste columna

```sql
ALTER TABLE public.mi_tabla DROP COLUMN nueva_columna;
```

### Si agregaste tabla

```sql
DROP TABLE IF EXISTS public.mi_nueva_tabla;
```

### Si cambiaste política

```sql
DROP POLICY IF EXISTS "Nombre politica" ON public.mi_tabla;
-- Recrear política anterior
```

---

## Checklist

- [ ] Migración escrita y revisada
- [ ] RLS configurado si es tabla nueva
- [ ] Verificar que no rompe datos existentes
- [ ] Plan de rollback documentado
- [ ] Migración aplicada en Test primero
- [ ] Verificación post-migración
- [ ] Migrar a Production
