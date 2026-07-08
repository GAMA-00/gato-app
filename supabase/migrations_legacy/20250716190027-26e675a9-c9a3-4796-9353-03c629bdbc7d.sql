-- Habilitar replicación completa para las tablas que necesitan actualizaciones en tiempo real
ALTER TABLE provider_availability REPLICA IDENTITY FULL;
ALTER TABLE provider_time_slots REPLICA IDENTITY FULL;

-- Agregar las tablas a la publicación de realtime de Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE provider_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE provider_time_slots;