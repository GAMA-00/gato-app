-- Create table to store admin dashboard stat offsets for reset functionality
CREATE TABLE public.admin_stat_offsets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_name TEXT NOT NULL UNIQUE,
  offset_value NUMERIC NOT NULL DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reset_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_stat_offsets ENABLE ROW LEVEL SECURITY;

-- Only admins can view and modify offsets
CREATE POLICY "Admins can view stat offsets"
ON public.admin_stat_offsets
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert stat offsets"
ON public.admin_stat_offsets
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update stat offsets"
ON public.admin_stat_offsets
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Insert initial offsets with current totals (this resets counters to zero)
-- We'll set these values via code after fetching current totals
INSERT INTO public.admin_stat_offsets (stat_name, offset_value) VALUES
  ('total_appointments', 37),
  ('total_revenue', 18080.00);