-- v4: Manual commissions + free-text buyer/seller names

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS buyer_commission numeric,
  ADD COLUMN IF NOT EXISTS seller_commission numeric,
  ADD COLUMN IF NOT EXISTS buyer_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS seller_name text DEFAULT '';
