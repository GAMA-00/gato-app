-- Tabla email_logs para tracking de emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  email_type text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_email_logs_appointment ON public.email_logs(appointment_id);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);

-- Enable RLS on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = _user_id
      AND role = 'admin'
  )
$$;

-- Políticas RLS para admin: permitir a admins ver todos los usuarios
CREATE POLICY "Admins can view all users" 
ON public.users 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Políticas RLS para admin: permitir a admins actualizar todos los usuarios
CREATE POLICY "Admins can update all users" 
ON public.users 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Políticas RLS para admin: permitir a admins ver todas las citas
CREATE POLICY "Admins can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Políticas RLS para admin: permitir a admins actualizar todas las citas
CREATE POLICY "Admins can update all appointments" 
ON public.appointments 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Políticas RLS para admin: permitir a admins ver todos los pagos
CREATE POLICY "Admins can view all payments" 
ON public.onvopay_payments 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Políticas RLS para email_logs: solo admins pueden ver
CREATE POLICY "Admins can view email logs" 
ON public.email_logs 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Políticas RLS para email_logs: service role puede insertar
CREATE POLICY "Service role can insert email logs" 
ON public.email_logs 
FOR INSERT 
WITH CHECK (true);