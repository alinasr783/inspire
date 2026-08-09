-- Add share_text column to units table
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'units' and column_name = 'share_text'
  ) then
    alter table public.units add column share_text text;
  end if;
end $$;
