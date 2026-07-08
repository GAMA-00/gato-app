-- Agrega recargo por transporte a los filtros de zona por día.
-- El recargo se cobra a clientes que reservan fuera de la zona asignada ese día.
ALTER TABLE provider_route_filters
  ADD COLUMN IF NOT EXISTS transport_surcharge_pct integer NOT NULL DEFAULT 0;
