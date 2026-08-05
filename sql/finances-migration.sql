-- IMPORTANT: Run this against your existing database to update the deals table.
-- This adds the new columns needed by the Finances page v2.

-- Add new columns (with safe defaults)
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS company_percentage integer NOT NULL DEFAULT 70;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS employee_percentage integer NOT NULL DEFAULT 30;

-- Drop old column that is no longer used
ALTER TABLE public.deals
  DROP COLUMN IF EXISTS other_expenses;

-- Update existing rows to have sensible defaults
UPDATE public.deals
SET company_percentage = 70,
    employee_percentage = 30
WHERE company_percentage IS NULL
   OR employee_percentage IS NULL;

-- Update the deal_employees side constraint to allow 'both'
ALTER TABLE public.deal_employees
  DROP CONSTRAINT IF EXISTS deal_employees_side_check;

ALTER TABLE public.deal_employees
  ADD CONSTRAINT deal_employees_side_check 
  CHECK (side = ANY (ARRAY['buyer', 'seller', 'both']));
