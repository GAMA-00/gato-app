

## Bug: Pantalla en blanco al iniciar sesion como admin desde login de cliente

### Causa raiz

Hay dos problemas trabajando juntos:

1. **Condicion de carrera en el rol**: Al iniciar sesion, `createUserFromSession` lee el rol desde `user_metadata` del token JWT. Si el metadata no tiene el rol 'admin', lo interpreta como 'client'. Luego, al cargar el perfil desde la base de datos, se actualiza a 'admin', pero para ese momento ya se disparo una redireccion incorrecta.

2. **`RoleGuard` y `ProtectedRoute` no manejan el rol 'admin'**: Cuando un usuario con rol 'admin' llega a una ruta protegida por `RoleGuard`, el componente detecta que el rol no coincide y redirige. Pero la logica de redireccion solo contempla 'client' y 'provider':

```text
// RoleGuard linea 68 (actual)
const userHomePath = user.role === 'client' ? '/client/categories' : '/dashboard';
// Admin cae en '/dashboard' (ruta de provider) → pantalla en blanco
```

El mismo problema existe en `ProtectedRoute` linea 46.

### Flujo actual (incorrecto)

```text
Admin inicia sesion desde /client/login
  → user_metadata.role puede ser undefined → rol inicial: 'client'
  → useEffect redirige a /client/categories
  → RoleGuard detecta rol 'admin' (tras carga de perfil)
  → Redirige a /dashboard (pensado para providers)
  → Ruta de provider rechaza admin → pantalla en blanco
```

### Flujo corregido

```text
Admin inicia sesion desde /client/login
  → ClientLogin espera a que profile este disponible antes de redirigir
  → Rol definitivo: 'admin' (desde perfil BD)
  → Redirige a /admin/dashboard
  → ProtectedAdminRoute valida y muestra contenido
```

### Cambios a implementar

**Archivo 1: `src/components/RoleGuard.tsx`** (linea 68)

Agregar manejo del rol 'admin' en la logica de redireccion por rol incorrecto:

```typescript
// Antes:
const userHomePath = user.role === 'client' ? '/client/categories' : '/dashboard';

// Despues:
const userHomePath = user.role === 'admin' 
  ? '/admin/dashboard' 
  : user.role === 'client' 
    ? '/client/categories' 
    : '/dashboard';
```

**Archivo 2: `src/components/ProtectedRoute.tsx`** (linea 46)

Mismo cambio: agregar manejo del rol 'admin':

```typescript
// Antes:
const redirectTo = user.role === 'client' ? '/client/categories' : '/dashboard';

// Despues:
const redirectTo = user.role === 'admin'
  ? '/admin/dashboard'
  : user.role === 'client' 
    ? '/client/categories' 
    : '/dashboard';
```

**Archivo 3: `src/pages/ClientLogin.tsx`** (linea 39-53)

Ajustar el useEffect para esperar a que el perfil este cargado antes de decidir la redireccion, evitando que un rol temporal cause la navegacion incorrecta:

```typescript
useEffect(() => {
  if (isAuthenticated && !isLoading && profile) {
    const role = profile.role || user?.role;
    if (role) {
      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'client') {
        navigate('/client/categories', { replace: true });
      } else if (role === 'provider') {
        navigate('/dashboard', { replace: true });
      }
    }
  }
}, [isAuthenticated, isLoading, profile, user, navigate]);
```

**Archivo 4: `src/pages/Login.tsx`** (linea 49-59)

Mismo ajuste: esperar `profile` antes de redirigir:

```typescript
useEffect(() => {
  if (isAuthenticated && !isLoading && profile) {
    const role = profile.role || user?.role;
    // ...mismo manejo de redirecciones
  }
}, [isAuthenticated, isLoading, profile, user, navigate]);
```

**Archivo 5: `src/components/AuthRoute.tsx`** (linea 25-29)

Agregar redireccion para admin:

```typescript
if (isAuthenticated && user) {
  const role = user.role;
  const redirectTo = role === 'admin' 
    ? '/admin/dashboard' 
    : role === 'provider' 
      ? '/dashboard' 
      : '/client/categories';
  return <Navigate to={redirectTo} replace />;
}
```

### Resumen de archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/RoleGuard.tsx` | Agregar redireccion a `/admin/dashboard` para rol admin |
| `src/components/ProtectedRoute.tsx` | Agregar redireccion a `/admin/dashboard` para rol admin |
| `src/pages/ClientLogin.tsx` | Esperar `profile` antes de redirigir |
| `src/pages/Login.tsx` | Esperar `profile` antes de redirigir |
| `src/components/AuthRoute.tsx` | Agregar redireccion para rol admin |

### Criterios de aceptacion

1. Admin inicia sesion desde `/client/login` y llega a `/admin/dashboard` sin pantalla en blanco
2. Admin inicia sesion desde `/login` y llega a `/admin/dashboard` sin pantalla en blanco
3. Client y provider siguen funcionando igual que antes
4. No hay estados intermedios visibles ni parpadeos de pantalla

