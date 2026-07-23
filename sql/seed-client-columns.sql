-- Add is_builtin flag
alter table public.client_column_config add column if not exists is_builtin boolean not null default false;

-- Allow 'textarea' in the type check constraint
alter table public.client_column_config drop constraint if exists client_column_config_type_check;
alter table public.client_column_config add constraint client_column_config_type_check
  check (type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'select'::text, 'textarea'::text]));

-- Seed the default columns (safe to run multiple times)
insert into public.client_column_config (key, label_ar, label_en, type, sort_order, enabled, is_builtin) values
  ('customer_name', 'اسم العميل', 'Customer Name', 'text', 0, true, true),
  ('phone', 'رقم الهاتف', 'Phone', 'text', 1, true, true),
  ('phone_alt', 'رقم هاتف آخر', 'Alternate Phone', 'text', 2, true, true),
  ('budget_from', 'الميزانية من', 'Budget From', 'number', 3, true, true),
  ('budget_to', 'الميزانية إلى', 'Budget To', 'number', 4, true, true),
  ('payment_method', 'كاش / تقسيط', 'Cash / Installment', 'text', 5, true, true),
  ('preferred_area', 'المنطقة المفضلة', 'Preferred Area', 'text', 6, true, true),
  ('unit_type', 'نوع الوحدة', 'Unit Type', 'text', 7, true, true),
  ('bedrooms', 'عدد غرف النوم', 'Bedrooms', 'text', 8, true, true),
  ('preferred_developer', 'المطور المفضل', 'Preferred Developer', 'text', 9, true, true),
  ('source', 'مصدر جلب العميل', 'Source', 'text', 10, true, true),
  ('last_contact_date', 'تاريخ آخر تواصل', 'Last Contact', 'date', 11, true, true),
  ('additional_notes', 'ملاحظات إضافية', 'Additional Notes', 'textarea', 12, true, true),
  ('assigned_employee', 'الموظف المسؤول', 'Assigned Employee', 'text', 13, true, true),
  ('created_by', 'تمت الإضافة بواسطة', 'Created By', 'text', 14, true, true)
on conflict (key) do nothing;
