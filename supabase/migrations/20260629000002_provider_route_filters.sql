-- Filtros de ruta del proveedor: días de la semana restringidos por provincia/cantón
CREATE TABLE IF NOT EXISTS public.provider_route_filters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=lun … 6=dom
  province_ids jsonb NOT NULL DEFAULT '[]',  -- array de provincia_id (int)
  canton_ids   jsonb NOT NULL DEFAULT '[]',  -- array de canton_id (int)
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, day_of_week)
);

ALTER TABLE public.provider_route_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Provider lee sus filtros" ON public.provider_route_filters;
CREATE POLICY "Provider lee sus filtros" ON public.provider_route_filters
  FOR SELECT TO authenticated USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Provider inserta sus filtros" ON public.provider_route_filters;
CREATE POLICY "Provider inserta sus filtros" ON public.provider_route_filters
  FOR INSERT TO authenticated WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Provider actualiza sus filtros" ON public.provider_route_filters;
CREATE POLICY "Provider actualiza sus filtros" ON public.provider_route_filters
  FOR UPDATE TO authenticated USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Provider elimina sus filtros" ON public.provider_route_filters;
CREATE POLICY "Provider elimina sus filtros" ON public.provider_route_filters
  FOR DELETE TO authenticated USING (provider_id = auth.uid());

-- Lectura pública para que el booking link pueda consultar los filtros
DROP POLICY IF EXISTS "Público lee filtros de ruta" ON public.provider_route_filters;
CREATE POLICY "Público lee filtros de ruta" ON public.provider_route_filters
  FOR SELECT TO anon USING (true);

GRANT SELECT ON public.provider_route_filters TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.provider_route_filters TO authenticated;
