-- =========================================================
--  Inspire CRM — Auth schema
--  Run this script in: Supabase → SQL Editor → Run
-- =========================================================

-- 1) Profiles table (extends auth.users with CRM fields)
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  first_name       text,
  second_name      text,
  phone            text,
  role             text not null default 'user'
                    check (role in ('user', 'admin')),
  approval_status  text not null default 'pending'
                    check (approval_status in ('pending', 'approved', 'rejected')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 2) Auto-create a profile row on every new sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, second_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'second_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 4) Prevent normal users from escalating privileges
--    (service_role / admin server actions / existing admins are exempt)
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('service_role', 'supabase_admin', 'postgres') then
    return new;
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    return new;
  end if;
  new.role = old.role;
  new.approval_status = old.approval_status;
  return new;
end;
$$;

drop trigger if exists profiles_no_escalation on public.profiles;
create trigger profiles_no_escalation
  before update on public.profiles
  for each row execute function public.prevent_privilege_escalation();

-- 5) Row Level Security
alter table public.profiles enable row level security;

-- Own profile: readable & updatable by its owner
create policy "Profiles are viewable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins: full read & update access (recognized via their own profile role)
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (true);

-- =========================================================
--  How to create the admin (do this manually):
--  a) Supabase Dashboard → Authentication → Users → Add user
--     (enter the admin email + a strong password)
--  b) Run the following (replace the email):
--
--  update public.profiles
--    set role = 'admin', approval_status = 'approved'
--    where email = 'admin@inspire.example';
-- =========================================================
