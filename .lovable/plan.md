

## Social Login con Google - Plan de implementacion

### Analisis del estado actual

- La tabla `users` NO tiene columnas `auth_provider` ni `profile_completed`
- El trigger `handle_new_user` crea el registro en `users` al registrarse, usando `user_metadata` de Supabase Auth
- Para Google OAuth, el trigger creara un registro con `residencia_id`, `house_number`, `phone` en NULL (perfil incompleto)
- No existe ruta ni pagina `/complete-profile`

### Estrategia para detectar perfil incompleto

En lugar de agregar una columna `profile_completed`, se detectara un perfil incompleto verificando si los campos obligatorios (`residencia_id`, `condominium_id`, `house_number`, `phone`) son NULL. Esto es mas robusto y no requiere migración adicional.

### Cambios a implementar

**1. Migracion de BD: agregar columna `auth_provider`**

```sql
ALTER TABLE public.users ADD COLUMN auth_provider text DEFAULT 'email';
```

Tambien actualizar el trigger `handle_new_user` para que setee `auth_provider` desde `NEW.raw_user_meta_data->>'auth_provider'` o desde `NEW.app_metadata->>'provider'`.

**2. Nueva pagina: `src/pages/CompleteProfile.tsx`**

Pantalla con los campos del paso 2 del registro actual:
- Residencia/condominio (dropdown) - reusa `ClientResidenceField`
- Numero de casa
- Telefono celular (+506)
- Nombre del referido (opcional)

Al enviar, actualiza la tabla `users` con los datos y redirige a `/client/categories`.

Pre-llena nombre y email desde la sesion de Google (`user.user_metadata.full_name`, `user.email`).

**3. Modificar `src/pages/ClientLogin.tsx`**

Agregar boton "Continuar con Google" despues de "Crear cuenta de Cliente":
- Llama `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/client/login' } })`
- El icono oficial de Google SVG ya existe en `RegisterForm.tsx`, se reutilizara

**4. Nueva ruta en `src/routes/PublicRoutes.tsx`**

Agregar:
```typescript
<Route key="complete-profile" path="/complete-profile" element={<CompleteProfile />} />
```

**5. Modificar logica de redireccion post-login**

En `src/pages/ClientLogin.tsx` y `src/components/AuthRoute.tsx`, agregar verificacion de perfil completo:

```typescript
// Despues de autenticar, si el perfil existe pero le faltan campos obligatorios:
if (profile && (!profile.residencia_id || !profile.phone || !profile.house_number)) {
  navigate('/complete-profile', { replace: true });
  return;
}
```

Esto aplica tanto para login con Google como para cualquier usuario con perfil incompleto.

**6. Modificar `src/contexts/auth/utils.ts`**

`createUserFromSession`: cuando el usuario viene de Google OAuth, obtener el nombre desde `user_metadata.full_name` (Google lo provee asi).

**7. Modificar `handle_new_user` trigger (migracion SQL)**

Actualizar para que setee `auth_provider` basado en el proveedor de autenticacion del usuario.

### Archivos a crear/modificar

| Archivo | Accion |
|---------|--------|
| `src/pages/CompleteProfile.tsx` | Crear - pantalla completar perfil |
| `src/pages/ClientLogin.tsx` | Modificar - agregar boton Google + redireccion perfil incompleto |
| `src/components/AuthRoute.tsx` | Modificar - redireccion a complete-profile si perfil incompleto |
| `src/routes/PublicRoutes.tsx` | Modificar - agregar ruta /complete-profile |
| `src/contexts/auth/utils.ts` | Modificar - soportar full_name de Google |
| Migracion SQL | Crear - columna auth_provider + actualizar trigger |

### Flujo final

```text
Google OAuth desde /client/login
  → Supabase autentica con Google
  → Trigger crea registro en users (name, email, role=client, auth_provider=google)
  → Redirect back a /client/login
  → useEffect detecta perfil incompleto (sin residencia/phone/house)
  → Redirige a /complete-profile
  → Usuario completa datos
  → UPDATE users SET residencia_id, condominium_id, house_number, phone
  → Redirige a /client/categories

Login futuro con Google
  → Perfil ya completo
  → Redirige directo a /client/categories
```

