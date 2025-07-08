-- Fix RLS policies para permitir que clientes actualicen sus propias citas (cancelar/reagendar)
-- Add missing UPDATE policy for clients on appointments table

CREATE POLICY "Clients can update their own appointments" 
ON appointments 
FOR UPDATE 
USING (auth.uid() = client_id) 
WITH CHECK (auth.uid() = client_id);

-- Add missing DELETE policy for appointments (para cleanup de citas canceladas en el historial)
CREATE POLICY "Clients can delete their cancelled appointments" 
ON appointments 
FOR DELETE 
USING (auth.uid() = client_id AND status = 'cancelled');