-- Nuevo sistema de slots de disponibilidad para proveedores
-- 1. Tabla para configurar disponibilidad semanal del proveedor
CREATE TABLE provider_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=domingo, 6=sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id, day_of_week, start_time, end_time)
);

-- 2. Tabla para slots de tiempo generados automáticamente
CREATE TABLE provider_time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_datetime_start TIMESTAMP WITH TIME ZONE NOT NULL,
  slot_datetime_end TIMESTAMP WITH TIME ZONE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_reserved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Índices para optimizar consultas
  UNIQUE(provider_id, listing_id, slot_datetime_start)
);

-- 3. Agregar duración estándar a la tabla listings
ALTER TABLE listings 
ADD COLUMN standard_duration INTEGER;

-- Actualizar servicios existentes con la duración actual como estándar
UPDATE listings 
SET standard_duration = duration 
WHERE standard_duration IS NULL;

-- Hacer que la duración estándar sea obligatoria
ALTER TABLE listings 
ALTER COLUMN standard_duration SET NOT NULL;