# 🛠️ Skill: Agregar Nueva Feature al Frontend

## Contexto

Esta skill te guía para agregar una nueva funcionalidad al frontend de Gato App siguiendo las convenciones del proyecto.

---

## Pre-requisitos

- [ ] Entender qué rol(es) usará la feature (client/provider/admin)
- [ ] Identificar si necesita nuevas tablas/columnas en DB
- [ ] Saber si requiere nueva Edge Function

---

## Pasos

### 1. Planificar la estructura

```
src/
├── pages/
│   └── MiNuevaPagina.tsx           # Si es página nueva
├── components/
│   └── mi-feature/                  # Componentes de la feature
│       ├── MiComponentePrincipal.tsx
│       ├── MiSubComponente.tsx
│       └── types.ts                 # Tipos locales
├── hooks/
│   └── useMiFeature.ts             # Hook personalizado
└── services/
    └── miFeatureService.ts         # Llamadas a API (opcional)
```

### 2. Crear el hook de datos

```typescript
// src/hooks/useMiFeature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMiFeature = (userId: string) => {
  const queryClient = useQueryClient();

  // Query para obtener datos
  const { data, isLoading, error } = useQuery({
    queryKey: ['mi-feature', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mi_tabla')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Mutation para crear/actualizar
  const createMutation = useMutation({
    mutationFn: async (newData: MiTipo) => {
      const { data, error } = await supabase
        .from('mi_tabla')
        .insert(newData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mi-feature'] });
    },
  });

  return {
    data,
    isLoading,
    error,
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
};
```

### 3. Crear componentes

```typescript
// src/components/mi-feature/MiComponente.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMiFeature } from '@/hooks/useMiFeature';

interface MiComponenteProps {
  userId: string;
}

export const MiComponente = ({ userId }: MiComponenteProps) => {
  const { data, isLoading, create } = useMiFeature(userId);

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi Feature</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Contenido */}
        <Button onClick={() => create({ ... })}>
          Acción
        </Button>
      </CardContent>
    </Card>
  );
};
```

### 4. Crear página (si aplica)

```typescript
// src/pages/MiNuevaPagina.tsx
import { useAuth } from '@/contexts/auth/AuthContext';
import { MiComponente } from '@/components/mi-feature/MiComponente';

const MiNuevaPagina = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Título</h1>
      <MiComponente userId={user.id} />
    </div>
  );
};

export default MiNuevaPagina;
```

### 5. Agregar ruta

```typescript
// En el archivo de rutas correspondiente
// src/routes/ClientRoutes.tsx o ProviderRoutes.tsx

<Route path="mi-nueva-ruta" element={<MiNuevaPagina />} />
```

---

## Convenciones del Proyecto

### Naming

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componentes | PascalCase | `MiComponente.tsx` |
| Hooks | camelCase con `use` | `useMiFeature.ts` |
| Utilidades | camelCase | `formatDate.ts` |
| Tipos | PascalCase | `MiTipo` |
| Constantes | UPPER_SNAKE | `MAX_ITEMS` |

### Estilos

```typescript
// ✅ Usar tokens semánticos de Tailwind
<div className="bg-background text-foreground">
<Button className="bg-primary text-primary-foreground">

// ❌ NO usar colores directos
<div className="bg-white text-black">
<Button className="bg-blue-500 text-white">
```

### Componentes UI

```typescript
// Usar componentes de shadcn/ui
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
```

---

## Checklist Final

- [ ] Hook creado con React Query
- [ ] Componentes en carpeta propia
- [ ] Tipos TypeScript definidos
- [ ] Ruta agregada
- [ ] Estilos usando tokens semánticos
- [ ] Componentes UI de shadcn
- [ ] Probado en preview
