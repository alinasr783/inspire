-- Migration: Ad Tracking — daily ad count per employee
-- Enables employees to log how many ads they posted each day

create table if not exists public.daily_ads (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  ad_count integer not null default 0 check (ad_count >= 0),
  entry_date date not null default current_date,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (employee_id, entry_date)
);

create index if not exists idx_daily_ads_employee_date on public.daily_ads (employee_id, entry_date desc);

-- trigger for updated_at
create or replace function public.update_daily_ads_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_daily_ads_updated_at on public.daily_ads;
create trigger trg_daily_ads_updated_at
  before update on public.daily_ads
  for each row execute function public.update_daily_ads_updated_at();

alter table public.daily_ads enable row level security;

-- Everyone authenticated can read
create policy "Authenticated can read daily_ads" on public.daily_ads
  for select to authenticated using (true);

-- Employee can insert their own record
create policy "Employee can insert own daily_ads" on public.daily_ads
  for insert to authenticated with check (employee_id = auth.uid());

-- Admin can insert for any employee
create policy "Admin can insert any daily_ads" on public.daily_ads
  for insert to authenticated with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Employee can update their own record
create policy "Employee can update own daily_ads" on public.daily_ads
  for update to authenticated using (employee_id = auth.uid()) with check (employee_id = auth.uid());

-- Admin can update any record
create policy "Admin can update any daily_ads" on public.daily_ads
  for update to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Employee can delete their own record
create policy "Employee can delete own daily_ads" on public.daily_ads
  for delete to authenticated using (employee_id = auth.uid());

-- Admin can delete any record
create policy "Admin can delete any daily_ads" on public.daily_ads
  for delete to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
