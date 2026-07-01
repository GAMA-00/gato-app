-- Tabla de miembros del equipo del proveedor
CREATE TABLE IF NOT EXISTS public.provider_team_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.provider_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members: owner full access" ON public.provider_team_members;
CREATE POLICY "Team members: owner full access" ON public.provider_team_members
  FOR ALL TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Team members: public read" ON public.provider_team_members;
CREATE POLICY "Team members: public read" ON public.provider_team_members
  FOR SELECT TO anon, authenticated
  USING (true);

-- Campo en appointments para asignar el miembro responsable
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS team_member_id uuid REFERENCES public.provider_team_members(id) ON DELETE SET NULL;

-- Índice para consultas por proveedor
CREATE INDEX IF NOT EXISTS idx_provider_team_members_provider ON public.provider_team_members(provider_id);
