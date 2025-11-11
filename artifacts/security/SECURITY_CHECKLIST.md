# 🔐 SECURITY CHECKLIST

## Continuous Security Guidelines

Esta checklist debe ejecutarse antes de mergear cualquier PR que involucre:
- Cambios en funciones SECURITY DEFINER
- Nuevos servicios (services/*.ts)
- Modificaciones a Row Level Security (RLS)
- Input handling de usuarios

---

## 1. SECURITY DEFINER Functions

### ✅ Validación Obligatoria

Ejecutar en Supabase SQL Editor:

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
ORDER BY p.proname;
```

### 🚫 Criterios de BLOQUEO

**TODAS** las funciones SECURITY DEFINER deben tener:

1. **SET search_path TO 'public'**
   ```sql
   CREATE OR REPLACE FUNCTION public.my_function(...)
   RETURNS ...
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path TO 'public'  -- ✅ OBLIGATORIO
   AS $$
   ```

2. **Authentication Guard (auth.uid())**
   ```sql
   DECLARE
     v_user_id UUID;
   BEGIN
     -- ✅ Guard de autenticación
     v_user_id := auth.uid();
     
     IF v_user_id IS NULL THEN
       RAISE EXCEPTION 'No autenticado';
     END IF;
   ```

3. **Authorization Check**
   ```sql
   -- ✅ Verificar ownership/permisos
   IF v_user_id != record.user_id THEN
     RAISE EXCEPTION 'No autorizado';
   END IF;
   ```

4. **No SQL Injection**
   - ❌ NO concatenar strings: `EXECUTE 'SELECT * FROM ' || table_name`
   - ✅ SÍ usar parámetros: `EXECUTE format('SELECT * FROM %I WHERE id = %L', table_name, id)`

---

## 2. Row Level Security (RLS)

### ✅ Validación por Tabla

Para cada tabla con datos sensibles:

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 📋 Políticas Requeridas

Para tablas con `user_id`:

```sql
-- SELECT policy
CREATE POLICY "Users can view own records"
ON public.table_name
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT policy
CREATE POLICY "Users can insert own records"
ON public.table_name
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
CREATE POLICY "Users can update own records"
ON public.table_name
FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE policy
CREATE POLICY "Users can delete own records"
ON public.table_name
FOR DELETE
USING (auth.uid() = user_id);
```

### 🚨 Casos Especiales

**Tablas públicas (read-only):**
```sql
CREATE POLICY "Anyone can view"
ON public.public_table
FOR SELECT
USING (true);
```

**Admin access:**
```sql
CREATE POLICY "Admins have full access"
ON public.table_name
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
```

---

## 3. Input Validation (Frontend)

### ✅ Zod Schemas Obligatorios

**En todos los formularios:**

```typescript
import { z } from 'zod';

// ✅ Ejemplo correcto
const FormSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(100, "Máximo 100 caracteres"),
  
  email: z.string()
    .trim()
    .email("Email inválido")
    .max(255),
  
  date: z.string()
    .refine((val) => !isNaN(Date.parse(val)), "Fecha inválida"),
  
  enum_field: z.enum(['option1', 'option2']),
  
  uuid: z.string().uuid("ID inválido")
});
```

**En services/*.ts:**

```typescript
// ✅ Validar IDs antes de queries
static async getById(id: string) {
  // Validate UUID
  const validId = z.string().uuid().parse(id);
  
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('id', validId)
    .single();
  
  // ...
}
```

### 🚫 Prohibiciones Absolutas

```typescript
// ❌ NUNCA hacer esto
const unsafeQuery = `SELECT * FROM users WHERE id = ${userId}`;

// ❌ NUNCA pasar input sin validar a URLs
window.open(`https://wa.me/${userPhone}`); // ❌ Vulnerable

// ✅ SIEMPRE validar y encodear
const phone = z.string().regex(/^\d+$/).parse(userInput);
window.open(`https://wa.me/${encodeURIComponent(phone)}`); // ✅ Seguro
```

---

## 4. Service Layer Security

### ✅ Checklist por Service

Para cada archivo en `src/services/*.ts`:

- [ ] **No expone `service_role` key**
- [ ] **Solo usa `anon` client de Supabase**
- [ ] **Valida inputs con Zod antes de queries**
- [ ] **Usa `logger` en lugar de `console.*`**
- [ ] **DTOs explícitos (no `any` en límites de módulo)**
- [ ] **Error handling apropiado**

**Ejemplo:**

```typescript
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client'; // ✅ anon client
import { logger } from '@/utils/logger';

// ✅ DTO con tipos explícitos
export const CreateRecordSchema = z.object({
  title: z.string().min(1),
  user_id: z.string().uuid()
});

export type CreateRecordDTO = z.infer<typeof CreateRecordSchema>;

export class MyService {
  static async create(data: CreateRecordDTO) {
    // ✅ Validar input
    const validated = CreateRecordSchema.parse(data);
    
    logger.debug('Creating record', { data: validated });
    
    const { data: result, error } = await supabase
      .from('table')
      .insert(validated)
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating record', error);
      throw error;
    }
    
    return result;
  }
}
```

---

## 5. Pre-Merge Checklist

### 🔍 Antes de aprobar PR

- [ ] **Security Definer Audit:** Ejecutado y ✅ PASS
- [ ] **RLS Policies:** Revisadas para nuevas tablas
- [ ] **Input Validation:** Zod schemas en todos los inputs
- [ ] **Service Layer:** Sin `any` en DTOs, sin `service_role`
- [ ] **No console.*:** Solo `logger` en código de producción
- [ ] **Build passing:** Sin errores TypeScript
- [ ] **ESLint clean:** `no-console` rule active
- [ ] **Smoke tests:** Funcionalidad básica OK

### 🚨 Casos que Requieren Doble Review

- Cambios en funciones SECURITY DEFINER
- Modificaciones a RLS policies
- Nuevos flows de pago/recurrencia
- Cambios en authentication flows

### 📊 Métricas de Seguridad

Track en cada PR:
- **Services centralizados:** % de queries que pasan por services/
- **Input validation:** % de formularios con Zod
- **Console usage:** 0 en rutas críticas
- **RLS coverage:** % de tablas con RLS enabled

---

## 6. Herramientas de Monitoreo

### Supabase Dashboard

1. **Logs:** https://supabase.com/dashboard/project/{project_id}/logs
2. **Auth:** https://supabase.com/dashboard/project/{project_id}/auth/users
3. **Database:** https://supabase.com/dashboard/project/{project_id}/editor

### CI/CD Gates

```yaml
# .github/workflows/security-check.yml (ejemplo)
name: Security Check

on: [pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # Fail if console.* found in critical paths
      - name: Check for console usage
        run: |
          if grep -r "console\." src/services/ src/hooks/use*.ts; then
            echo "❌ console.* found in critical paths"
            exit 1
          fi
      
      # Ensure no-console rule is active
      - name: Verify ESLint config
        run: |
          grep '"no-console"' eslint.config.js || exit 1
```

---

## 📝 Evidencia Requerida

Para PRs que tocan seguridad:

1. **Screenshot del SQL audit** (SECURITY DEFINER)
2. **Output del RLS check** (políticas activas)
3. **Smoke test results** (login → operación → logout)
4. **Build logs** (ESLint + TypeScript clean)

Guardar en: `artifacts/security/PR_{number}_{date}.txt`

---

## 🔗 Referencias

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Zod Documentation](https://zod.dev/)
- [PR #5 Security Audit](./SECDEF_2025-11-11_FIXED.txt)

---

**Última actualización:** 2025-11-11  
**Owner:** Security Team  
**Próxima revisión:** Al final de PR #6
