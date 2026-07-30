-- Table cell style preferences (per user)
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

-- Alter existing table to add new columns (run if table already exists)
-- ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS border_color text;
-- ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS border_width text;
-- ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS text_align text;
-- ALTER TABLE public.cell_styles ADD COLUMN IF NOT EXISTS vertical_align text;

ALTER TABLE public.cell_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read own styles" ON public.cell_styles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Allow insert own styles" ON public.cell_styles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Allow update own styles" ON public.cell_styles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Allow delete own styles" ON public.cell_styles FOR DELETE TO authenticated USING (user_id = auth.uid());
