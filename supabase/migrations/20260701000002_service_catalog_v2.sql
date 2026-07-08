-- Catálogo de servicios v2: 6 categorías, 30 tipos.
-- Aplica sobre un DB limpio (sin listings ni service_types existentes).

-- Categorías
INSERT INTO service_categories (id, name, label, icon) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','home','Hogar','home'),
  ('aaaaaaaa-0000-0000-0000-000000000002','pets','Mascotas','paw-print'),
  ('aaaaaaaa-0000-0000-0000-000000000003','classes','Clases','book-open'),
  ('aaaaaaaa-0000-0000-0000-000000000004','personal-care','Cuidado Personal','heart'),
  ('aaaaaaaa-0000-0000-0000-000000000005','sports','Deportes','activity'),
  ('aaaaaaaa-0000-0000-0000-000000000006','other','Otros','more-horizontal')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon;

-- Tipos de servicio (IDs autogenerados por gen_random_uuid())
INSERT INTO service_types (name, category_id) VALUES
  -- Hogar
  ('Limpieza',               'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Lavacar',                'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Fumigación',             'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Jardinería',             'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Hidrolavado',            'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Planchado',              'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Chef Privado',           'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Flores a domicilio',     'aaaaaaaa-0000-0000-0000-000000000001'),
  ('Mantenimiento',          'aaaaaaaa-0000-0000-0000-000000000001'),
  -- Mascotas
  ('Paseo de perros',        'aaaaaaaa-0000-0000-0000-000000000002'),
  ('Pet Grooming',           'aaaaaaaa-0000-0000-0000-000000000002'),
  ('Veterinario',            'aaaaaaaa-0000-0000-0000-000000000002'),
  -- Clases
  ('Tutorías primaria y secundaria', 'aaaaaaaa-0000-0000-0000-000000000003'),
  ('Idiomas',                'aaaaaaaa-0000-0000-0000-000000000003'),
  ('Música',                 'aaaaaaaa-0000-0000-0000-000000000003'),
  ('Pintura',                'aaaaaaaa-0000-0000-0000-000000000003'),
  -- Cuidado Personal
  ('Fisioterapia',           'aaaaaaaa-0000-0000-0000-000000000004'),
  ('Masajes',                'aaaaaaaa-0000-0000-0000-000000000004'),
  ('Manicurista',            'aaaaaaaa-0000-0000-0000-000000000004'),
  ('Peluquería',             'aaaaaaaa-0000-0000-0000-000000000004'),
  ('Depilación',             'aaaaaaaa-0000-0000-0000-000000000004'),
  -- Deportes
  ('Entrenador Personal',    'aaaaaaaa-0000-0000-0000-000000000005'),
  ('Mantenimiento Bicicletas','aaaaaaaa-0000-0000-0000-000000000005'),
  ('Yoga',                   'aaaaaaaa-0000-0000-0000-000000000005'),
  ('Pilates',                'aaaaaaaa-0000-0000-0000-000000000005'),
  ('Tenis',                  'aaaaaaaa-0000-0000-0000-000000000005'),
  -- Otros
  ('Fotógrafo',              'aaaaaaaa-0000-0000-0000-000000000006'),
  ('Niñera',                 'aaaaaaaa-0000-0000-0000-000000000006'),
  ('Enfermería',             'aaaaaaaa-0000-0000-0000-000000000006'),
  ('Cuidado adulto mayor',   'aaaaaaaa-0000-0000-0000-000000000006');
