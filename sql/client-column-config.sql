-- Create client_column_config table (same structure as unit_column_config)
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

-- Seed built-in client columns (skip if already exist)
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

-- Enable RLS
ALTER TABLE public.client_column_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow read for authenticated" ON public.client_column_config
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Allow all for authenticated" ON public.client_column_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
