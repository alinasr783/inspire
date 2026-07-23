-- =========================================================
--  Inspire CRM — Tasks module
--  Run this script in: Supabase → SQL Editor → Run
-- =========================================================

-- 1) Add position column to profiles (if not exists)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'position'
  ) then
    alter table public.profiles add column position text default '';
  end if;
end $$;

-- 2) Tasks table
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  progress     integer not null default 0
               check (progress >= 0 and progress <= 100),
  status       text not null default 'active'
               check (status in ('active', 'overdue', 'completed')),
  due_date     date not null,
  assigned_to  uuid not null references public.profiles(id) on delete cascade,
  created_by   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 3) Auto-update updated_at on tasks
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- 4) Row Level Security
alter table public.tasks enable row level security;

-- Tasks: everyone can read
create policy "Anyone can read tasks"
  on public.tasks for select
  using (true);

-- Tasks: authenticated users can insert
create policy "Authenticated users can insert tasks"
  on public.tasks for insert
  with check (auth.role() = 'authenticated');

-- Tasks: only admins can update
create policy "Admins can update tasks"
  on public.tasks for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Tasks: only admins can delete
create policy "Admins can delete tasks"
  on public.tasks for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 5) Seed sample data (optional — runs only if tasks table is empty)
do $$
declare
  emp_record record;
  admin_id uuid;
begin
  if not exists (select 1 from public.tasks limit 1) then
    -- Get the first admin user (if any)
    select id into admin_id from public.profiles where role = 'admin' limit 1;

    for emp_record in
      select id from public.profiles
      where approval_status = 'approved'
        and id != admin_id
      limit 6
    loop
      insert into public.tasks (title, progress, status, due_date, assigned_to, created_by) values
        ('متابعة عميل جديد', floor(random() * 100)::int, 'active',  current_date + (random() * 10)::int, emp_record.id, coalesce(admin_id, emp_record.id)),
        ('تحديث بيانات العميل', floor(random() * 100)::int, 'active',  current_date + (random() * 7)::int,  emp_record.id, coalesce(admin_id, emp_record.id));
    end loop;
  end if;
end $$;
