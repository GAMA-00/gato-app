
-- Habilitar la extensión UUID
create extension if not exists "uuid-ossp";

-- Configuración del sistema
create table system_settings (
  id uuid primary key default uuid_generate_v4(),
  commission_rate decimal not null default 20.0, -- Porcentaje de comisión
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de perfiles extendida
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('admin', 'provider', 'client')),
  name text not null,
  email text not null,
  phone text,
  about_me text, -- Nueva columna para descripción del proveedor
  building_id uuid,
  has_payment_method boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de edificios
create table buildings (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de servicios extendida (sin columna generada)
create table services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  duration integer not null,
  base_price decimal not null, -- Precio base establecido por el proveedor
  description text not null,
  provider_id uuid references profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de servicios por edificio
create table building_services (
  building_id uuid references buildings(id),
  service_id uuid references services(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (building_id, service_id)
);

-- Políticas de cancelación
create table cancellation_policies (
  id uuid primary key default uuid_generate_v4(),
  hours_before decimal not null, -- Horas antes del servicio
  refund_percentage integer not null, -- Porcentaje de reembolso
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de citas extendida
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid references services(id) not null,
  client_id uuid references profiles(id) not null,
  provider_id uuid references profiles(id) not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text not null check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
  cancellation_time timestamp with time zone, -- Tiempo cuando se canceló la cita
  refund_percentage integer, -- Porcentaje de reembolso aplicado
  recurrence text check (recurrence in ('none', 'daily', 'weekly', 'biweekly', 'monthly')),
  notes text,
  admin_notes text,
  building_id uuid references buildings(id),
  apartment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_modified_by uuid references profiles(id),
  last_modified_at timestamp with time zone
);

-- Insertar configuración inicial del sistema
insert into system_settings (commission_rate) values (20.0);

-- Insertar políticas de cancelación predeterminadas
insert into cancellation_policies (hours_before, refund_percentage) values
  (24, 100),  -- Hasta 24 horas antes: cancelación gratuita
  (4, 75),    -- De 24h a 4h: 75% de reembolso
  (0.75, 50), -- De 4h a 45min: 50% de reembolso
  (0, 35);    -- De 45min a inicio: 35% de reembolso

-- Políticas de seguridad RLS
alter table profiles enable row level security;
alter table services enable row level security;
alter table appointments enable row level security;
alter table buildings enable row level security;
alter table building_services enable row level security;
alter table system_settings enable row level security;
alter table cancellation_policies enable row level security;

-- Crear políticas RLS básicas
create policy "Público puede ver servicios"
  on services for select
  using (true);

create policy "Proveedores pueden crear servicios"
  on services for insert
  with check (auth.uid() = provider_id);

create policy "Proveedores pueden actualizar sus servicios"
  on services for update
  using (auth.uid() = provider_id);

-- Función para calcular el reembolso
create or replace function calculate_refund_percentage(cancellation_time timestamp with time zone, appointment_start timestamp with time zone)
returns integer as $$
declare
  hours_before decimal;
  refund integer;
begin
  hours_before := extract(epoch from (appointment_start - cancellation_time))/3600;
  
  select refund_percentage into refund
  from cancellation_policies
  where hours_before <= $1
  order by hours_before desc
  limit 1;
  
  return coalesce(refund, 0);
end;
$$ language plpgsql;
