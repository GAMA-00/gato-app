-- ===== FASE 1: AGREGAR COLUMNA AVAILABILITY AL LISTING =====

-- Agregar columna availability a listings si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' 
        AND column_name = 'availability'
    ) THEN
        ALTER TABLE listings ADD COLUMN availability JSONB;
    END IF;
END $$;

-- ===== FASE 2: RESTRICCIÓN DE UN LISTING POR PROVEEDOR =====

-- Agregar constraint único para un listing por proveedor
-- Primero verificar si ya existe la constraint
DO $$ 
BEGIN
    -- Solo agregar si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_provider_listing' 
        AND table_name = 'listings'
    ) THEN
        ALTER TABLE listings ADD CONSTRAINT unique_provider_listing UNIQUE (provider_id);
    END IF;
END $$;

-- ===== FASE 3: FUNCIÓN PARA CONSOLIDAR PROVEEDORES CON MÚLTIPLES LISTINGS =====

-- Función para consolidar proveedores que tienen múltiples listings
CREATE OR REPLACE FUNCTION consolidate_multiple_listings()
RETURNS INTEGER AS $$
DECLARE
  provider_record RECORD;
  main_listing_id UUID;
  consolidated_count INTEGER := 0;
BEGIN
  -- Buscar proveedores con múltiples listings
  FOR provider_record IN 
    SELECT provider_id, COUNT(*) as listing_count
    FROM listings 
    WHERE is_active = true
    GROUP BY provider_id 
    HAVING COUNT(*) > 1
  LOOP
    -- Seleccionar el listing más reciente como principal
    SELECT id INTO main_listing_id
    FROM listings 
    WHERE provider_id = provider_record.provider_id 
      AND is_active = true
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Desactivar los otros listings del proveedor
    UPDATE listings 
    SET is_active = false
    WHERE provider_id = provider_record.provider_id 
      AND id != main_listing_id
      AND is_active = true;
    
    consolidated_count := consolidated_count + 1;
    
    RAISE LOG 'Consolidado proveedor % - manteniendo listing %', 
      provider_record.provider_id, main_listing_id;
  END LOOP;
  
  RETURN consolidated_count;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar consolidación de listings múltiples
SELECT consolidate_multiple_listings();