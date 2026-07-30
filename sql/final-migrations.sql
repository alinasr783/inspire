-- =========================================================
--  FINAL MIGRATIONS — COPY-PASTE into Supabase SQL Editor
--  Safe to re-run (all idempotent)
--  Based on current schema from supabase.sql
-- =========================================================

-- 1) Seed assigned_employee into unit_column_config (table already exists)
INSERT INTO public.unit_column_config (key, label_ar, label_en, type, sort_order, enabled, is_builtin) VALUES
  ('assigned_employee', 'الموظف المسؤول', 'Assigned Employee', 'text', 13, true, true)
ON CONFLICT (key) DO NOTHING;

-- 2) client_column_config RLS (table already exists, just need policies)
ALTER TABLE public.client_column_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.client_column_config;
CREATE POLICY "Allow read for authenticated" ON public.client_column_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.client_column_config;
CREATE POLICY "Allow all for authenticated" ON public.client_column_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3) cell_styles: add new columns + unique constraint + RLS
ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS border_color text;
ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS border_width text;
ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS text_align text;
ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS vertical_align text;

-- Add unique constraint if missing (drop first to avoid conflict)
ALTER TABLE public.cell_styles DROP CONSTRAINT IF EXISTS cell_styles_unique;
ALTER TABLE public.cell_styles ADD CONSTRAINT cell_styles_unique UNIQUE (user_id, table_name, element_type, element_key);

ALTER TABLE public.cell_styles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read own styles" ON public.cell_styles;
CREATE POLICY "Allow read own styles" ON public.cell_styles FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Allow insert own styles" ON public.cell_styles;
CREATE POLICY "Allow insert own styles" ON public.cell_styles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Allow update own styles" ON public.cell_styles;
CREATE POLICY "Allow update own styles" ON public.cell_styles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Allow delete own styles" ON public.cell_styles;
CREATE POLICY "Allow delete own styles" ON public.cell_styles FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4) unit_type_similarity: add unique constraint + RLS + seed data
ALTER TABLE public.unit_type_similarity DROP CONSTRAINT IF EXISTS unit_type_similarity_ab_key;
ALTER TABLE public.unit_type_similarity ADD CONSTRAINT unit_type_similarity_ab_key UNIQUE (type_a, type_b);

ALTER TABLE public.unit_type_similarity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.unit_type_similarity;
CREATE POLICY "Allow read for authenticated" ON public.unit_type_similarity FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.unit_type_similarity;
CREATE POLICY "Allow all for authenticated" ON public.unit_type_similarity FOR ALL TO authenticated USING (true) WITH CHECK (true);

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

-- 5) location_similarity: add unique constraint + RLS
ALTER TABLE public.location_similarity DROP CONSTRAINT IF EXISTS location_similarity_ab_key;
ALTER TABLE public.location_similarity ADD CONSTRAINT location_similarity_ab_key UNIQUE (area_a, area_b);

ALTER TABLE public.location_similarity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.location_similarity;
CREATE POLICY "Allow read for authenticated" ON public.location_similarity FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.location_similarity;
CREATE POLICY "Allow all for authenticated" ON public.location_similarity FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6) generated_deals: add unique constraint (table already exists with correct columns)
ALTER TABLE public.generated_deals DROP CONSTRAINT IF EXISTS generated_deals_client_property_unique;
ALTER TABLE public.generated_deals ADD CONSTRAINT generated_deals_client_property_unique UNIQUE (client_id, property_id);

-- 7) Seed location similarity pairs
INSERT INTO public.location_similarity (area_a, area_b, similarity) VALUES
  ('The Brooks','The Brooks',100), ('The Brooks','Stone Residence',45),
  ('Sheikh Zayed','Sheikh Zayed',100), ('Sheikh Zayed','6th of October',70), ('Sheikh Zayed','October',70),
  ('6th of October','6th of October',100), ('6th of October','Sheikh Zayed',70), ('6th of October','October',100),
  ('October','October',100), ('October','6th of October',100), ('October','Sheikh Zayed',70),
  ('New Cairo','New Cairo',100), ('New Cairo','Madinaty',85), ('New Cairo','Rehab',80), ('New Cairo','5th Settlement',90), ('New Cairo','Tagamoa',90),
  ('Madinaty','Madinaty',100), ('Madinaty','New Cairo',85), ('Madinaty','Rehab',65),
  ('Rehab','Rehab',100), ('Rehab','New Cairo',80), ('Rehab','Madinaty',65),
  ('5th Settlement','5th Settlement',100), ('5th Settlement','New Cairo',90), ('5th Settlement','Tagamoa',100),
  ('Tagamoa','Tagamoa',100), ('Tagamoa','New Cairo',90), ('Tagamoa','5th Settlement',100),
  ('Maadi','Maadi',100), ('Maadi','Degla',85), ('Maadi','Zahraa Maadi',80), ('Maadi','Helwan',40),
  ('Degla','Degla',100), ('Degla','Maadi',85), ('Degla','Zahraa Maadi',75),
  ('Zahraa Maadi','Zahraa Maadi',100), ('Zahraa Maadi','Maadi',80), ('Zahraa Maadi','Degla',75),
  ('Nasr City','Nasr City',100), ('Nasr City','Heliopolis',70), ('Nasr City','Abbasiya',60),
  ('Heliopolis','Heliopolis',100), ('Heliopolis','Nasr City',70), ('Heliopolis','Abbasiya',65),
  ('Abbasiya','Abbasiya',100), ('Abbasiya','Heliopolis',65), ('Abbasiya','Nasr City',60),
  ('Ain Sokhna','Ain Sokhna',100), ('Ain Sokhna','Galala',80),
  ('Galala','Galala',100), ('Galala','Ain Sokhna',80),
  ('North Coast','North Coast',100), ('North Coast','Sahel',100), ('North Coast','Marina',85), ('North Coast','Hacienda Bay',75),
  ('Sahel','Sahel',100), ('Sahel','North Coast',100), ('Sahel','Marina',85),
  ('Marina','Marina',100), ('Marina','North Coast',85), ('Marina','Sahel',85),
  ('Hacienda Bay','Hacienda Bay',100), ('Hacienda Bay','North Coast',75),
  ('Zayed','Zayed',100), ('Zayed','Sheikh Zayed',100),
  ('Mostakbal City','Mostakbal City',100), ('Mostakbal City','New Cairo',60), ('Mostakbal City','Madinaty',50),
  ('Shorouk','Shorouk',100), ('Shorouk','Madinaty',55), ('Shorouk','New Cairo',50),
  ('Obour','Obour',100), ('Obour','Shorouk',45)
ON CONFLICT (area_a, area_b) DO NOTHING;

-- =========================================================
--  DONE
-- =========================================================
