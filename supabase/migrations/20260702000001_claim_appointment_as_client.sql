-- RPC para que un cliente autenticado vincule un appointment creado por create_external_booking
-- (que inserta client_id = NULL). RLS no permite el UPDATE directo porque client_id es NULL.
CREATE OR REPLACE FUNCTION public.claim_appointment_as_client(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE appointments
  SET
    client_id       = v_user_id,
    external_booking = false,
    created_from    = 'client_app'
  WHERE id = p_appointment_id
    AND client_id IS NULL;  -- solo si aún no tiene dueño (evita secuestro)

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo vincular el appointment: no existe o ya tiene cliente asignado';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_appointment_as_client(uuid) TO authenticated;
