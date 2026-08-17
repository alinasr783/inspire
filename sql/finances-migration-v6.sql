-- v6: Partners system
-- partners = fixed list of admin users designated as partners
-- deal_partners = per-deal profit split among partners

CREATE TABLE IF NOT EXISTS public.partners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT partners_pkey PRIMARY KEY (id),
  CONSTRAINT partners_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.profiles(id),
  CONSTRAINT partners_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.deal_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  percentage numeric NOT NULL,
  profit_amount numeric NOT NULL DEFAULT 0,
  CONSTRAINT deal_partners_pkey PRIMARY KEY (id),
  CONSTRAINT deal_partners_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE,
  CONSTRAINT deal_partners_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.profiles(id)
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_partners" ON public.partners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_deal_partners" ON public.deal_partners FOR ALL USING (true) WITH CHECK (true);
