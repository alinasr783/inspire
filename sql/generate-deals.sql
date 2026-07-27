-- Configurable Unit Type Similarity Matrix
CREATE TABLE IF NOT EXISTS public.unit_type_similarity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type_a text NOT NULL,
  type_b text NOT NULL,
  similarity integer NOT NULL CHECK (similarity >= 0 AND similarity <= 100),
  CONSTRAINT unit_type_similarity_pkey PRIMARY KEY (id),
  CONSTRAINT unit_type_similarity_ab_key UNIQUE (type_a, type_b)
);

-- Configurable Location Similarity Matrix
CREATE TABLE IF NOT EXISTS public.location_similarity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  area_a text NOT NULL,
  area_b text NOT NULL,
  similarity integer NOT NULL CHECK (similarity >= 0 AND similarity <= 100),
  CONSTRAINT location_similarity_pkey PRIMARY KEY (id),
  CONSTRAINT location_similarity_ab_key UNIQUE (area_a, area_b)
);

-- Generated Deals cache
CREATE TABLE IF NOT EXISTS public.generated_deals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  final_score numeric(5,2) NOT NULL DEFAULT 0,
  system_score numeric(5,2) NOT NULL DEFAULT 0,
  ai_score numeric(5,2) NOT NULL DEFAULT 0,
  ai_confidence numeric(5,2) NOT NULL DEFAULT 0,
  budget_match numeric(5,2) NOT NULL DEFAULT 0,
  unit_type_match numeric(5,2) NOT NULL DEFAULT 0,
  bedrooms_match numeric(5,2) NOT NULL DEFAULT 0,
  freshness_score numeric(5,2) NOT NULL DEFAULT 0,
  hard_filter_results jsonb NOT NULL DEFAULT '{}',
  ai_analysis jsonb NOT NULL DEFAULT '{}',
  recommendation_status text NOT NULL DEFAULT 'pending' CHECK (recommendation_status = ANY (ARRAY['pending','approved','rejected'])),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT generated_deals_pkey PRIMARY KEY (id),
  CONSTRAINT generated_deals_client_property_unique UNIQUE (client_id, property_id)
);

-- Enable RLS
ALTER TABLE public.unit_type_similarity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_similarity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_deals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated read
CREATE POLICY "Allow read for authenticated" ON public.unit_type_similarity FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated" ON public.location_similarity FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read own deals" ON public.generated_deals FOR SELECT TO authenticated USING (created_by = auth.uid());

-- Allow admin write
CREATE POLICY "Allow all for authenticated" ON public.unit_type_similarity FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.location_similarity FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow insert own deals" ON public.generated_deals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Allow update own deals" ON public.generated_deals FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Seed default unit type similarities
INSERT INTO public.unit_type_similarity (type_a, type_b, similarity) VALUES
  ('شقة','شقة',100), ('شقة','Apartment',100), ('شقة','دوبلكس',95), ('شقة','Duplex',95),
  ('شقة','بنتهاوس',90), ('شقة','Penthouse',90), ('شقة','ستوديو',85), ('شقة','Studio',85),
  ('شقة','فيلا',40), ('شقة','Villa',40), ('شقة','تاون هاوس',50), ('شقة','Townhouse',50),
  ('شقة','مكتب',25), ('شقة','Office',25), ('شقة','أرض',5), ('شقة','Land',5),
  ('فيلا','فيلا',100), ('فيلا','Villa',100), ('فيلا','تاون هاوس',95), ('فيلا','Townhouse',95),
  ('فيلا','دوبلكس',70), ('فيلا','Duplex',70), ('فيلا','شقة',40), ('فيلا','Apartment',40),
  ('فيلا','مكتب',20), ('فيلا','Office',20), ('فيلا','أرض',10), ('فيلا','Land',10),
  ('أرض','أرض',100), ('أرض','Land',100), ('أرض','فيلا',10), ('أرض','Villa',10),
  ('أرض','شقة',5), ('أرض','Apartment',5), ('أرض','مكتب',30), ('أرض','Office',30),
  ('مكتب','مكتب',100), ('مكتب','Office',100), ('مكتب','شقة',25), ('مكتب','Apartment',25),
  ('مكتب','دوبلكس',15), ('مكتب','Duplex',15), ('مكتب','فيلا',20), ('مكتب','Villa',20)
ON CONFLICT (type_a, type_b) DO NOTHING;
