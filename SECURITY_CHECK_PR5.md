# Security Check - Funciones SECURITY DEFINER

## Query de Validación

Para verificar las funciones con privilegios elevados, ejecutar en Supabase SQL Editor:

```sql
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✅ YES' 
    ELSE '❌ NO' 
  END as has_search_path,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%auth.uid()%' THEN '✅ YES' 
    ELSE '❌ NO' 
  END as has_auth_guard
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true
  AND n.nspname = 'public'
  AND p.proname IN (
    'create_appointment_with_slot_extended',
    'create_appointment_with_slot',
    'advance_recurring_appointment',
    'cancel_appointment_atomic'
  )
ORDER BY p.proname;
```

## Criterios de Aprobación

Cada función DEBE tener:

### 1. SET search_path TO 'public'
- ✅ **Necesario**: Previene ataques de schema injection
- ❌ **Faltante**: Vulnerabilidad crítica de seguridad

### 2. Guard auth.uid()
- ✅ **Necesario**: Valida que el usuario autenticado tiene permisos
- ❌ **Faltante**: Permite operaciones no autorizadas

### 3. Parámetros Validados
- Validar que todos los parámetros vienen de sources confiables
- No confiar en input del cliente sin validación
- Usar queries parametrizadas (no concatenación de strings)

## Resultados Esperados

| Función | search_path | auth.uid() | Status |
|---------|-------------|------------|--------|
| create_appointment_with_slot_extended | ✅ | ✅ | ✅ |
| create_appointment_with_slot | ✅ | ✅ | ✅ |
| advance_recurring_appointment | ✅ | ✅ | ✅ |
| cancel_appointment_atomic | ✅ | ✅ | ✅ |

**Si alguna función muestra ❌ → BLOQUEO de PR hasta resolver**

## Código de Ejemplo Correcto

```sql
CREATE OR REPLACE FUNCTION public.create_appointment_with_slot_extended(
  p_listing_id UUID,
  p_client_id UUID,
  p_provider_id UUID,
  -- ... más params
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- ✅ CRÍTICO
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- ✅ Guard de autenticación
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  
  IF v_user_id != p_client_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  
  -- ... resto de la lógica
END;
$$;
```

## Acciones si hay Vulnerabilidades

1. **Función sin search_path**:
   ```sql
   ALTER FUNCTION public.nombre_funcion SET search_path TO 'public';
   ```

2. **Función sin auth guard**:
   - Agregar validación de `auth.uid()` al inicio
   - Verificar permisos antes de operaciones críticas

3. **SQL Injection risk**:
   - Reemplazar concatenación con queries parametrizadas
   - Usar `EXECUTE format()` con parámetros seguros

---

**Ejecutar esta validación ANTES de mergear cualquier PR que toque datos sensibles**
