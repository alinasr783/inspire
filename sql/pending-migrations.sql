-- =========================================================
--  Pending Migrations — Run in Supabase SQL Editor
--  Safe to re-run (all idempotent)
-- =========================================================

-- 1) Add assigned_employee column to units
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS assigned_employee uuid REFERENCES public.profiles(id);

INSERT INTO public.unit_column_config (key, label_ar, label_en, type, sort_order, enabled, is_builtin) VALUES
  ('assigned_employee', 'الموظف المسؤول', 'Assigned Employee', 'text', 13, true, true)
ON CONFLICT (key) DO NOTHING;

-- 2) Client column config table + seed
CREATE TABLE IF NOT EXISTS public.client_column_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  type text NOT NULL DEFAULT 'text'::text CHECK (type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'select'::text, 'textarea'::text])),
  options jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_builtin boolean NOT NULL DEFAULT false,
  CONSTRAINT client_column_config_pkey PRIMARY KEY (id)
);

INSERT INTO public.client_column_config (key, label_ar, label_en, type, sort_order, enabled, is_builtin) VALUES
  ('customer_name', 'اسم العميل', 'Customer Name', 'text', 0, true, true),
  ('phone', 'رقم الهاتف', 'Phone', 'text', 1, true, true),
  ('phone_alt', 'رقم هاتف آخر', 'Alternate Phone', 'text', 2, true, true),
  ('budget_from', 'الميزانية من', 'Budget From', 'number', 3, true, true),
  ('budget_to', 'الميزانية إلى', 'Budget To', 'number', 4, true, true),
  ('payment_method', 'طريقة الدفع', 'Payment Method', 'text', 5, true, true),
  ('preferred_area', 'المنطقة المفضلة', 'Preferred Area', 'text', 6, true, true),
  ('unit_type', 'نوع الوحدة', 'Unit Type', 'text', 7, true, true),
  ('bedrooms', 'غرف النوم', 'Bedrooms', 'text', 8, true, true),
  ('preferred_developer', 'المطور المفضل', 'Preferred Developer', 'text', 9, true, true),
  ('source', 'المصدر', 'Source', 'text', 10, true, true),
  ('last_contact_date', 'تاريخ آخر تواصل', 'Last Contact', 'date', 11, true, true),
  ('additional_notes', 'ملاحظات إضافية', 'Additional Notes', 'textarea', 12, true, true),
  ('assigned_employee', 'الموظف المسؤول', 'Assigned Employee', 'text', 13, true, true),
  ('created_by', 'تمت الإضافة بواسطة', 'Created By', 'text', 14, true, true)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.client_column_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow read for authenticated" ON public.client_column_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Allow all for authenticated" ON public.client_column_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3) Cell styles table (per-user style preferences)
CREATE TABLE IF NOT EXISTS public.cell_styles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  element_type text NOT NULL CHECK (element_type = ANY (ARRAY['table','column','row','cell'])),
  element_key text NOT NULL,
  text_color text,
  background_color text,
  font_size integer,
  font_weight text,
  border_style text,
  border_color text,
  border_width text,
  text_align text,
  vertical_align text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cell_styles_pkey PRIMARY KEY (id),
  CONSTRAINT cell_styles_unique UNIQUE (user_id, table_name, element_type, element_key)
);

-- Add new columns if table already exists (idempotent)
ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS border_color text;
ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS border_width text;
ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS text_align text;
ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS vertical_align text;

ALTER TABLE public.cell_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow read own styles" ON public.cell_styles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Allow insert own styles" ON public.cell_styles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Allow update own styles" ON public.cell_styles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "Allow delete own styles" ON public.cell_styles FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4) Generate Deals: unit type similarity matrix
CREATE TABLE IF NOT EXISTS public.unit_type_similarity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type_a text NOT NULL,
  type_b text NOT NULL,
  similarity integer NOT NULL CHECK (similarity >= 0 AND similarity <= 100),
  CONSTRAINT unit_type_similarity_pkey PRIMARY KEY (id),
  CONSTRAINT unit_type_similarity_ab_key UNIQUE (type_a, type_b)
);

ALTER TABLE public.unit_type_similarity ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow read for authenticated" ON public.unit_type_similarity FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated" ON public.unit_type_similarity FOR ALL TO authenticated USING (true) WITH CHECK (true);

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

-- 5) Generate Deals: location similarity matrix
CREATE TABLE IF NOT EXISTS public.location_similarity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  area_a text NOT NULL,
  area_b text NOT NULL,
  similarity integer NOT NULL CHECK (similarity >= 0 AND similarity <= 100),
  CONSTRAINT location_similarity_pkey PRIMARY KEY (id),
  CONSTRAINT location_similarity_ab_key UNIQUE (area_a, area_b)
);

ALTER TABLE public.location_similarity ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow read for authenticated" ON public.location_similarity FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated" ON public.location_similarity FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6) Generate Deals: generated deals storage
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

ALTER TABLE public.generated_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow read own deals" ON public.generated_deals FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY IF NOT EXISTS "Allow insert own deals" ON public.generated_deals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY IF NOT EXISTS "Allow update own deals" ON public.generated_deals FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- =========================================================
--  DONE. Run seed-locations.sql separately if location data
--  is needed (it contains ~50 area similarity pairs)
-- =========================================================
