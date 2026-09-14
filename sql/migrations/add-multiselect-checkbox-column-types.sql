-- Allow 'multi_select' and 'checkbox' custom column types for properties.
-- Safe to run multiple times.
alter table public.unit_column_config drop constraint if exists unit_column_config_type_check;
alter table public.unit_column_config add constraint unit_column_config_type_check
  check (type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'select'::text, 'multi_select'::text, 'checkbox'::text, 'textarea'::text]));
