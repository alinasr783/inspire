-- Migration: Task Type & Confirmation Tracking
-- Adds task_type, folder_id, file_id, records_target to tasks
-- Drops old task_confirmed_records table (no longer needed — now counts by file + assigned_employee)

alter table public.tasks add column if not exists task_type text;
alter table public.tasks add column if not exists folder_id uuid references public.unconfirmed_folders(id) on delete set null;
alter table public.tasks add column if not exists file_id uuid references public.unconfirmed_files(id) on delete set null;
alter table public.tasks add column if not exists records_target integer;

-- Drop old approach table if it exists
drop table if exists public.task_confirmed_records cascade;
