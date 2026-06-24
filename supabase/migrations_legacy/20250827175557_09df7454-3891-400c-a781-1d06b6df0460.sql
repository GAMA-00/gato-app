
-- 1) Agregar columna para el “Nombre del gasto” (no rompemos registros viejos)
ALTER TABLE public.post_payment_items
ADD COLUMN IF NOT EXISTS item_name text NOT NULL DEFAULT '';

-- 2) Hacer que la descripción breve sea realmente opcional
ALTER TABLE public.post_payment_items
ALTER COLUMN description DROP NOT NULL;

-- 3) Agregar columna para foto de evidencia por ítem
ALTER TABLE public.post_payment_items
ADD COLUMN IF NOT EXISTS evidence_file_url text NULL;

-- Notas:
-- - No se requieren cambios de RLS: las políticas de post_payment_items ya limitan por la factura del proveedor.
-- - Reutilizaremos el bucket 'service-gallery' para almacenar la evidencia por ítem.
