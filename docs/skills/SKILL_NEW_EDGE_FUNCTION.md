# 🛠️ Skill: Crear Nueva Edge Function

## Contexto

Esta skill te guía para crear una nueva Edge Function en Supabase para el proyecto Gato App.

---

## Pre-requisitos

- [ ] Acceso al proyecto Supabase
- [ ] Entender el propósito de la función
- [ ] Conocer qué tablas de DB necesita acceder

---

## Pasos

### 1. Crear estructura de carpeta

```bash
supabase/functions/
└── mi-nueva-funcion/
    ├── index.ts       # Handler principal
    ├── types.ts       # Tipos TypeScript (opcional)
    ├── utils.ts       # Utilidades (opcional)
    └── README.md      # Documentación
```

### 2. Template básico de `index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Crear cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Tu lógica aquí
    const body = await req.json();
    
    // Ejemplo: consultar DB
    const { data, error } = await supabase
      .from('mi_tabla')
      .select('*')
      .limit(10);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
```

### 3. Agregar tipos (si aplica)

```typescript
// types.ts
export interface MiRequest {
  campo1: string;
  campo2: number;
}

export interface MiResponse {
  success: boolean;
  data?: any;
  error?: string;
}
```

### 4. Documentar en README.md

```markdown
# Mi Nueva Función

## Propósito
Breve descripción de qué hace la función.

## Request
```json
{
  "campo1": "valor",
  "campo2": 123
}
```

## Response
```json
{
  "success": true,
  "data": { ... }
}
```

## Errores
| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request | Falta campo requerido |
| 500 | Internal Error | Error de DB |
```

### 5. Desplegar

```bash
# Desde raíz del proyecto
supabase functions deploy mi-nueva-funcion
```

---

## Patrones Comunes

### Autenticación JWT

```typescript
// Verificar token del usuario
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401 });
}

const { data: { user }, error } = await supabase.auth.getUser(
  authHeader.replace('Bearer ', '')
);
```

### Llamar a OnvoPay

```typescript
const ONVOPAY_SECRET_KEY = Deno.env.get('ONVOPAY_SECRET_KEY');

const response = await fetch('https://api.onvopay.com/v1/...', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ONVOPAY_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});
```

### Enviar Email con Resend

```typescript
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Gato App <noreply@gatoapp.com>',
    to: email,
    subject: 'Asunto',
    html: '<p>Contenido</p>',
  }),
});
```

---

## Checklist Final

- [ ] Función creada con estructura correcta
- [ ] CORS headers configurados
- [ ] Manejo de errores implementado
- [ ] README documentado
- [ ] Desplegada y probada
