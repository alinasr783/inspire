-- Migration: Add seriousness_rating column to clients table
alter table public.clients add column if not exists seriousness_rating integer;
alter table public.clients add constraint clients_seriousness_rating_check check (seriousness_rating >= 1 and seriousness_rating <= 10);

-- Allow 'conditional' element_type in cell_styles for conditional formatting features
alter table public.cell_styles drop constraint if exists cell_styles_element_type_check;
alter table public.cell_styles add constraint cell_styles_element_type_check check (element_type = ANY (ARRAY['table'::text, 'column'::text, 'row'::text, 'cell'::text, 'conditional'::text]));
