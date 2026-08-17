-- =========================================================
--  Ad Campaigns feature
--  Tracks the company's marketing campaigns, links clients
--  and financial deals to a campaign, and computes campaign
--  profitability metrics (ROI, CPA, conversion rate, ...).
--  Run this in Supabase SQL Editor.
--  Safe to re-run (all idempotent).
-- =========================================================

-- 1) Main campaigns table
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  total_cost numeric NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  platform text NOT NULL DEFAULT ''::text,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text])),
  start_date date,
  end_date date,
  notes text NOT NULL DEFAULT ''::text,
  currency text NOT NULL DEFAULT 'EGP'::text,
  color text NOT NULL DEFAULT '#276ef1'::text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ad_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT ad_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- 2) Link clients to a campaign (single attribution)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ad_campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL;

-- 3) Link financial deals to a campaign (single attribution)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS ad_campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL;

-- 4) Indexes
CREATE INDEX IF NOT EXISTS ad_campaigns_created_by_idx ON public.ad_campaigns(created_by);
CREATE INDEX IF NOT EXISTS ad_campaigns_status_idx ON public.ad_campaigns(status);
CREATE INDEX IF NOT EXISTS clients_ad_campaign_id_idx ON public.clients(ad_campaign_id);
CREATE INDEX IF NOT EXISTS deals_ad_campaign_id_idx ON public.deals(ad_campaign_id);

-- 5) RLS
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all ad campaigns" ON public.ad_campaigns;
CREATE POLICY "Admins can view all ad campaigns"
  ON public.ad_campaigns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can insert ad campaigns" ON public.ad_campaigns;
CREATE POLICY "Admins can insert ad campaigns"
  ON public.ad_campaigns FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update ad campaigns" ON public.ad_campaigns;
CREATE POLICY "Admins can update ad campaigns"
  ON public.ad_campaigns FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete ad campaigns" ON public.ad_campaigns;
CREATE POLICY "Admins can delete ad campaigns"
  ON public.ad_campaigns FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
