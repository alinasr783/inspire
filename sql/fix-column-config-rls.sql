-- Replace admin-only RLS with any authenticated user
drop policy if exists "Admins can insert column config" on public.unit_column_config;
drop policy if exists "Admins can update column config" on public.unit_column_config;
drop policy if exists "Admins can delete column config" on public.unit_column_config;

create policy "Users can insert column config"
  on public.unit_column_config for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update column config"
  on public.unit_column_config for update
  using (auth.role() = 'authenticated');

create policy "Users can delete column config"
  on public.unit_column_config for delete
  using (auth.role() = 'authenticated');
