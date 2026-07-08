-- Datos de demo para el simulador local. Idempotente.
-- Proveedora demo (booking link público gato.app/demo) + cliente demo.
-- Login: demo@gato.app / cliente@gato.app  — contraseña: gato1234

-- Limpiar demo previo
DELETE FROM auth.users WHERE id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');

-- Categoría y tipo de servicio
INSERT INTO public.service_categories (id, name, label, icon)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001','home','Hogar','home')
ON CONFLICT (name) DO NOTHING;
INSERT INTO public.service_types (id, name, category_id) VALUES
 ('bbbbbbbb-0000-0000-0000-000000000001','Limpieza del hogar','aaaaaaaa-0000-0000-0000-000000000001'),
 ('bbbbbbbb-0000-0000-0000-000000000002','Fisioterapia / masajes','aaaaaaaa-0000-0000-0000-000000000001'),
 ('bbbbbbbb-0000-0000-0000-000000000003','Lavado de carros','aaaaaaaa-0000-0000-0000-000000000001'),
 ('bbbbbbbb-0000-0000-0000-000000000004','Belleza a domicilio','aaaaaaaa-0000-0000-0000-000000000001'),
 ('bbbbbbbb-0000-0000-0000-000000000005','Jardinería','aaaaaaaa-0000-0000-0000-000000000001'),
 ('bbbbbbbb-0000-0000-0000-000000000006','Otro','aaaaaaaa-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Usuarios auth (el trigger on_auth_user_created crea public.users)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES
('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated',
 'demo@gato.app', crypt('gato1234', gen_salt('bf')), now(), now(), now(),
 '{"provider":"email","providers":["email"]}','{"name":"María Demo","role":"provider"}','','','',''),
('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','authenticated','authenticated',
 'cliente@gato.app', crypt('gato1234', gen_salt('bf')), now(), now(), now(),
 '{"provider":"email","providers":["email"]}','{"name":"Carlos Cliente","role":"client"}','','','','');

-- Perfil del proveedor (slug + cantón base + bio)
UPDATE public.users SET slug='demo', canton_base_id=102, about_me='Limpieza profesional del hogar con 5 años de experiencia.',
  experience_years=5, phone='50688880000', average_rating=4.8
WHERE id='11111111-1111-1111-1111-111111111111';

-- Disponibilidad Lun–Vie 8:00–18:00 (necesario ANTES del listing para generar slots)
INSERT INTO public.provider_availability (provider_id, day_of_week, start_time, end_time, is_active)
SELECT '11111111-1111-1111-1111-111111111111', d, '08:00', '18:00', true
FROM generate_series(1,5) d
ON CONFLICT (provider_id, day_of_week, start_time, end_time) DO NOTHING;

-- Catálogo (listing). El trigger genera slots automáticamente.
INSERT INTO public.listings (id, provider_id, service_type_id, title, description, base_price, duration,
  standard_duration, is_active, currency, slot_size)
VALUES ('cccccccc-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','bbbbbbbb-0000-0000-0000-000000000001',
  'Limpieza general','Limpieza completa de tu casa o apartamento.', 25000, 180, 180, true, 'CRC', 30)
ON CONFLICT (provider_id) DO NOTHING;

-- (los slots los genera automáticamente el trigger del listing; no re-generar
--  aquí porque el validador de duplicados aborta la transacción)

-- Zonas de trabajo: Escazú (102) y Santa Ana (109)
INSERT INTO public.provider_cantones (provider_id, canton_id, accepts_requests)
VALUES ('11111111-1111-1111-1111-111111111111',102,true),
       ('11111111-1111-1111-1111-111111111111',109,true)
ON CONFLICT (provider_id, canton_id) DO NOTHING;

-- Config: descuento por proximidad activo 10% (para ver la feature)
INSERT INTO public.provider_settings (provider_id, proximity_discount_enabled, proximity_discount_pct, show_recommended_slots)
VALUES ('11111111-1111-1111-1111-111111111111', true, 10, true)
ON CONFLICT (provider_id) DO UPDATE SET proximity_discount_enabled=true, proximity_discount_pct=10;
