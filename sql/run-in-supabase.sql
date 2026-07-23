-- =========================================================
--  Run this ENTIRE script in Supabase SQL Editor
-- =========================================================

-- 1) Dynamic dropdown options table for units
create table if not exists public.unit_dropdown_options (
  id        uuid primary key default gen_random_uuid(),
  category  text not null,
  value     text not null,
  unique(category, value),
  created_at timestamptz not null default now()
);

alter table public.unit_dropdown_options enable row level security;

-- Drop existing policies first to avoid "already exists" errors
drop policy if exists "Anyone can read dropdown options" on public.unit_dropdown_options;
drop policy if exists "Authenticated users can insert dropdown options" on public.unit_dropdown_options;

create policy "Anyone can read dropdown options"
  on public.unit_dropdown_options for select
  using (true);

create policy "Authenticated users can insert dropdown options"
  on public.unit_dropdown_options for insert
  with check (auth.role() = 'authenticated');

-- Seed initial values (Arabic, matching DynamicSelect defaults)
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

-- 2) RLS policies for units table (safe: drop first, then create)
drop policy if exists "Anyone can read units" on public.units;
drop policy if exists "Users can insert units" on public.units;
drop policy if exists "Users can update own units" on public.units;
drop policy if exists "Admins can update all units" on public.units;
drop policy if exists "Users can delete own units" on public.units;
drop policy if exists "Admins can delete all units" on public.units;

alter table public.units enable row level security;

create policy "Anyone can read units"
  on public.units for select
  using (true);

create policy "Users can insert units"
  on public.units for insert
  with check (auth.uid() = created_by);

create policy "Users can update own units"
  on public.units for update
  using (auth.uid() = created_by);

create policy "Admins can update all units"
  on public.units for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can delete own units"
  on public.units for delete
  using (auth.uid() = created_by);

create policy "Admins can delete all units"
  on public.units for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 3) RLS policies for unit_column_config
drop policy if exists "Anyone can read column config" on public.unit_column_config;
drop policy if exists "Admins can insert column config" on public.unit_column_config;
drop policy if exists "Admins can update column config" on public.unit_column_config;
drop policy if exists "Admins can delete column config" on public.unit_column_config;

alter table public.unit_column_config enable row level security;

create policy "Anyone can read column config"
  on public.unit_column_config for select
  using (true);

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

-- 4) Auto-update updated_at on units (safe idempotent function)
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
