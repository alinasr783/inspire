-- v5: Building/Apartment/Compound fields + Expenses

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS building_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS apartment_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS compound_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS expenses numeric DEFAULT 0;
