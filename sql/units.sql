-- =========================================================
--  Inspire CRM — Units module
--  Run this script in: Supabase → SQL Editor → Run
-- =========================================================

-- 1) Units table
create table if not exists public.units (
  id                uuid primary key default gen_random_uuid(),
  customer_name     text not null,
  phone             text not null,
  compound_name     text not null default '',
  area              text,
  building_number   text,
  finishing_status  text,
  rent_sale         text,
  unit_type         text,
  cash_required     numeric,
  remaining         numeric,
  last_contact_date date,
  additional_notes  text,
  feedback          text,
  custom_fields     jsonb not null default '{}'::jsonb,
  created_by        uuid not null references public.profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- If table already exists, add compound_name column
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'units' and column_name = 'compound_name'
  ) then
    alter table public.units add column compound_name text not null default '';
  end if;
end $$;

-- 2) Custom columns configuration table (admin-managed)
create table if not exists public.unit_column_config (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label_ar    text not null,
  label_en    text not null,
  type        text not null default 'text'
              check (type in ('text', 'number', 'date', 'select')),
  options     jsonb,
  sort_order  integer not null default 0,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 3) Auto-update updated_at on units
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists units_set_updated_at on public.units;
create trigger units_set_updated_at
  before update on public.units
  for each row execute function public.set_updated_at();

-- 4) Row Level Security
alter table public.units enable row level security;
alter table public.unit_column_config enable row level security;

-- Units: everyone can read
create policy "Anyone can read units"
  on public.units for select
  using (true);

-- Units: authenticated users can insert (created_by must be themselves)
create policy "Users can insert units"
  on public.units for insert
  with check (auth.uid() = created_by);

-- Units: owners can update; admins can update any
create policy "Users can update own units"
  on public.units for update
  using (auth.uid() = created_by);

create policy "Admins can update all units"
  on public.units for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Units: owners can delete; admins can delete any
create policy "Users can delete own units"
  on public.units for delete
  using (auth.uid() = created_by);

create policy "Admins can delete all units"
  on public.units for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- unit_column_config: everyone can read
create policy "Anyone can read column config"
  on public.unit_column_config for select
  using (true);

-- unit_column_config: only admins can manage
create policy "Admins can insert column config"
  on public.unit_column_config for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update column config"
  on public.unit_column_config for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete column config"
  on public.unit_column_config for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 5) Dynamic dropdown options for units (user-extendable)
create table if not exists public.unit_dropdown_options (
  id        uuid primary key default gen_random_uuid(),
  category  text not null,
  value     text not null,
  unique(category, value),
  created_at timestamptz not null default now()
);

alter table public.unit_dropdown_options enable row level security;

create policy "Anyone can read dropdown options"
  on public.unit_dropdown_options for select
  using (true);

create policy "Authenticated users can insert dropdown options"
  on public.unit_dropdown_options for insert
  with check (auth.role() = 'authenticated');

-- Seed initial values
insert into public.unit_dropdown_options (category, value) values
  ('finishing_status', 'راو'),
  ('finishing_status', 'نصف تشطيب'),
  ('finishing_status', 'تشطيب كامل'),
  ('finishing_status', 'تحت الإنشاء'),
  ('rent_sale', 'إيجار'),
  ('rent_sale', 'بيع'),
  ('unit_type', 'شقة'),
  ('unit_type', 'فيلا'),
  ('unit_type', 'دوبلكس'),
  ('unit_type', 'مكتب'),
  ('unit_type', 'أرض'),
  ('unit_type', 'تجاري')
on conflict (category, value) do nothing;
