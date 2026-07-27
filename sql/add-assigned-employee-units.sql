-- Add assigned_employee column to units table
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS assigned_employee uuid REFERENCES public.profiles(id);

-- Add to column config seed
INSERT INTO public.unit_column_config (key, label_ar, label_en, type, sort_order, enabled, is_builtin) VALUES
  ('assigned_employee', 'الموظف المسؤول', 'Assigned Employee', 'text', 13, true, true)
ON CONFLICT (key) DO NOTHING;
