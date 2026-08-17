-- =========================================================
--  Company Clients feature
--  Adds a flag to distinguish company-sourced clients from
--  employee-sourced clients. Existing rows default to false
--  (employee clients) so nothing breaks.
--  Run this in Supabase SQL Editor.
-- =========================================================

alter table public.clients
  add column if not exists is_company_client boolean not null default false;

create index if not exists clients_is_company_client_idx
  on public.clients (is_company_client);
