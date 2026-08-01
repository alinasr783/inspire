-- Migration: Track devices that open the user's account (Connected Devices page)
create table if not exists public.user_devices (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fingerprint text not null,
  label text,
  user_agent text,
  last_seen_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint user_devices_pkey primary key (id),
  constraint user_devices_unique unique (user_id, fingerprint)
);

alter table public.user_devices enable row level security;

create policy "Users can read own devices"
  on public.user_devices for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own devices"
  on public.user_devices for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own devices"
  on public.user_devices for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own devices"
  on public.user_devices for delete to authenticated
  using (user_id = auth.uid());
