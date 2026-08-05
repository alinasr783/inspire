-- v2: Updated schema — flexible split, employee both sides, removed other_expenses

CREATE TABLE IF NOT EXISTS public.deals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,

  contact_type text NOT NULL CHECK (contact_type = ANY (ARRAY['both', 'buyer_only', 'seller_only'])),

  buyer_client_id uuid,
  seller_unit_id uuid,

  buyer_amount numeric,
  seller_amount numeric,

  auto_commission numeric,
  final_commission numeric NOT NULL,

  has_employee boolean NOT NULL DEFAULT false,
  company_percentage integer NOT NULL DEFAULT 70,
  employee_percentage integer NOT NULL DEFAULT 30,
  company_net_profit numeric NOT NULL DEFAULT 0,

  CONSTRAINT deals_pkey PRIMARY KEY (id),
  CONSTRAINT deals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT deals_buyer_client_id_fkey FOREIGN KEY (buyer_client_id) REFERENCES public.clients(id),
  CONSTRAINT deals_seller_unit_id_fkey FOREIGN KEY (seller_unit_id) REFERENCES public.units(id)
);

CREATE TABLE IF NOT EXISTS public.deal_employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  side text NOT NULL CHECK (side = ANY (ARRAY['buyer', 'seller', 'both'])),
  percentage integer NOT NULL,
  profit_amount numeric NOT NULL DEFAULT 0,

  CONSTRAINT deal_employees_pkey PRIMARY KEY (id),
  CONSTRAINT deal_employees_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE,
  CONSTRAINT deal_employees_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id)
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_deals" ON public.deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_deal_employees" ON public.deal_employees FOR ALL USING (true) WITH CHECK (true);
