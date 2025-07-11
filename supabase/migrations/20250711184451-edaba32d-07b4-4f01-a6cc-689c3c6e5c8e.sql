-- Create the recurring_exceptions table for handling cancellations and reschedules
CREATE TABLE public.recurring_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('cancelled', 'rescheduled')),
  new_start_time TIMESTAMP WITH TIME ZONE,
  new_end_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, exception_date)
);

-- Enable RLS
ALTER TABLE public.recurring_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for recurring_exceptions
CREATE POLICY "Clients can manage their recurring exceptions"
ON public.recurring_exceptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE appointments.id = recurring_exceptions.appointment_id 
    AND appointments.client_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE appointments.id = recurring_exceptions.appointment_id 
    AND appointments.client_id = auth.uid()
  )
);

CREATE POLICY "Providers can manage their recurring exceptions"
ON public.recurring_exceptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE appointments.id = recurring_exceptions.appointment_id 
    AND appointments.provider_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE appointments.id = recurring_exceptions.appointment_id 
    AND appointments.provider_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_recurring_exceptions_appointment_id ON public.recurring_exceptions(appointment_id);
CREATE INDEX idx_recurring_exceptions_exception_date ON public.recurring_exceptions(exception_date);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_recurring_exceptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recurring_exceptions_updated_at
  BEFORE UPDATE ON public.recurring_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_recurring_exceptions_updated_at();