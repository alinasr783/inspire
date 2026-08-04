-- =========================================================
--  Inspire CRM — Unit Gallery Module
--  Run this script in: Supabase → SQL Editor → Run
-- =========================================================

-- 1) Gallery sections table
create table if not exists public.unit_gallery_sections (
  id          uuid primary key default gen_random_uuid(),
  unit_id     uuid not null references public.units(id) on delete cascade,
  name        text not null,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) Gallery images table
create table if not exists public.unit_gallery_images (
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid not null references public.unit_gallery_sections(id) on delete cascade,
  storage_path  text not null,
  original_name text,
  file_size     bigint,
  content_type  text,
  uploaded_by   uuid not null references public.profiles(id) on delete cascade,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- 3) Auto-update updated_at on sections
drop trigger if exists gallery_sections_set_updated_at on public.unit_gallery_sections;
create trigger gallery_sections_set_updated_at
  before update on public.unit_gallery_sections
  for each row execute function public.set_updated_at();

-- 4) Row Level Security
alter table public.unit_gallery_sections enable row level security;
alter table public.unit_gallery_images enable row level security;

-- =========================================================
-- unit_gallery_sections policies
-- =========================================================

-- Everyone can read sections
create policy "Anyone can read gallery sections"
  on public.unit_gallery_sections for select
  using (true);

-- Owner, assigned employee, or admin can insert sections
create policy "Authorized users can insert gallery sections"
  on public.unit_gallery_sections for insert
  with check (
    exists (
      select 1 from public.units
      where id = unit_id
        and (
          created_by = auth.uid()
          or assigned_employee = auth.uid()
          or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
        )
    )
  );

-- Owner, assigned employee, or admin can update sections
create policy "Authorized users can update gallery sections"
  on public.unit_gallery_sections for update
  using (
    exists (
      select 1 from public.units
      where id = unit_id
        and (
          created_by = auth.uid()
          or assigned_employee = auth.uid()
          or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
        )
    )
  );

-- Owner, assigned employee, or admin can delete sections
create policy "Authorized users can delete gallery sections"
  on public.unit_gallery_sections for delete
  using (
    exists (
      select 1 from public.units
      where id = unit_id
        and (
          created_by = auth.uid()
          or assigned_employee = auth.uid()
          or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
        )
    )
  );

-- =========================================================
-- unit_gallery_images policies
-- =========================================================

-- Everyone can read images
create policy "Anyone can read gallery images"
  on public.unit_gallery_images for select
  using (true);

-- Check permission via parent section -> unit
create or replace function public.can_manage_gallery_section(section_id uuid)
returns boolean
language plpgsql
as $$
begin
  return exists (
    select 1 from public.unit_gallery_sections s
    join public.units u on u.id = s.unit_id
    where s.id = section_id
      and (
        u.created_by = auth.uid()
        or u.assigned_employee = auth.uid()
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
  );
end;
$$;

-- Authorized users can insert images
create policy "Authorized users can insert gallery images"
  on public.unit_gallery_images for insert
  with check (public.can_manage_gallery_section(section_id));

-- Authorized users can update images
create policy "Authorized users can update gallery images"
  on public.unit_gallery_images for update
  using (public.can_manage_gallery_section(section_id));

-- Authorized users can delete images
create policy "Authorized users can delete gallery images"
  on public.unit_gallery_images for delete
  using (public.can_manage_gallery_section(section_id));
