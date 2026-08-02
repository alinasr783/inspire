-- Migration: Tasks v2 — Kanban support with drag-and-drop
-- Add description, target columns and new statuses

alter table public.tasks add column if not exists description text;
alter table public.tasks add column if not exists target integer;

-- Update existing data to new statuses
update public.tasks set status = 'in_progress' where status = 'active';
update public.tasks set status = 'in_progress' where status = 'overdue';
update public.tasks set status = 'done' where status = 'completed';

-- Drop old constraint and add new one
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check check (status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'done'::text]));

-- Drop old RLS policies and recreate with proper role checks
drop policy if exists "Allow update own tasks" on public.tasks;
drop policy if exists "Allow delete own tasks" on public.tasks;
drop policy if exists "Authenticated select tasks" on public.tasks;
drop policy if exists "Authenticated insert tasks" on public.tasks;

-- Anyone can read tasks (needed for admin overview)
create policy "Anyone can read tasks" on public.tasks for select to authenticated using (true);

-- Only admins can insert tasks
create policy "Admins can insert tasks" on public.tasks for insert to authenticated with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Only admins can update tasks
create policy "Admins can update tasks" on public.tasks for update to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
) with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Only admins can delete tasks
create policy "Admins can delete tasks" on public.tasks for delete to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Allow employees to update only the status of their own tasks (for drag-and-drop)
create policy "Employees can update own task status" on public.tasks for update to authenticated using (
  assigned_to = auth.uid()
) with check (
  assigned_to = auth.uid()
);
