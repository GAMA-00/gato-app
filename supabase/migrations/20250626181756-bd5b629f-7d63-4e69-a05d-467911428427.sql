
-- Crear tabla para miembros del equipo
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cedula TEXT NOT NULL,
  phone TEXT NOT NULL,
  photo_url TEXT,
  criminal_record_file_url TEXT,
  role TEXT NOT NULL DEFAULT 'auxiliar',
  position_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Política para que proveedores vean solo sus miembros de equipo
CREATE POLICY "Providers can view their team members" 
  ON public.team_members 
  FOR SELECT 
  USING (provider_id = auth.uid());

-- Política para que proveedores inserten sus miembros de equipo
CREATE POLICY "Providers can insert their team members" 
  ON public.team_members 
  FOR INSERT 
  WITH CHECK (provider_id = auth.uid());

-- Política para que proveedores actualicen sus miembros de equipo
CREATE POLICY "Providers can update their team members" 
  ON public.team_members 
  FOR UPDATE 
  USING (provider_id = auth.uid());

-- Política para que proveedores eliminen sus miembros de equipo
CREATE POLICY "Providers can delete their team members" 
  ON public.team_members 
  FOR DELETE 
  USING (provider_id = auth.uid());

-- Política para que clientes vean miembros del equipo de sus proveedores activos
CREATE POLICY "Clients can view team members of their service providers" 
  ON public.team_members 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a 
      WHERE a.provider_id = team_members.provider_id 
      AND a.client_id = auth.uid()
      AND a.status IN ('pending', 'confirmed')
    )
  );

-- Índices para mejorar performance
CREATE INDEX idx_team_members_provider_id ON public.team_members(provider_id);
CREATE INDEX idx_team_members_provider_order ON public.team_members(provider_id, position_order);

-- Comentarios para documentar la tabla
COMMENT ON TABLE public.team_members IS 'Miembros del equipo de trabajo de cada proveedor';
COMMENT ON COLUMN public.team_members.role IS 'Rol del miembro: lider o auxiliar';
COMMENT ON COLUMN public.team_members.position_order IS 'Orden de posición para auxiliares (Auxiliar 1, 2, etc.)';
COMMENT ON COLUMN public.team_members.criminal_record_file_url IS 'URL del archivo de hoja de delincuencia';
