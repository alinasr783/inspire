-- Run this on Supabase SQL Editor to add the nathryat column

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS nathryat numeric NOT NULL DEFAULT 0;

-- Recalculate nathryat for existing rows that have employees
UPDATE public.deals
SET nathryat = ROUND((final_commission * (company_percentage::numeric / 100) * 0.10)::numeric, 2)
WHERE has_employee = true
  AND nathryat = 0;
