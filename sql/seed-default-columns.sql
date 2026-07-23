-- Add is_builtin flag to unit_column_config
alter table public.unit_column_config add column if not exists is_builtin boolean not null default false;

-- Allow 'textarea' in the type check constraint
alter table public.unit_column_config drop constraint if exists unit_column_config_type_check;
alter table public.unit_column_config add constraint unit_column_config_type_check
  check (type = ANY (ARRAY['text'::text, 'number'::text, 'date'::text, 'select'::text, 'textarea'::text]));

-- Seed the 13 default columns (safe to run multiple times)
insert into public.unit_column_config (key, label_ar, label_en, type, sort_order, enabled, is_builtin) values
  ('customer_name', 'اسم العميل', 'Customer Name', 'text', 0, true, true),
  ('phone', 'رقم الهاتف', 'Phone', 'text', 1, true, true),
  ('compound_name', 'الكمبوند / الموقع', 'Compound / Location', 'text', 2, true, true),
  ('area', 'المساحة', 'Area', 'text', 3, true, true),
  ('building_number', 'رقم العمارة', 'Building No.', 'text', 4, true, true),
  ('finishing_status', 'حالة التشطيب', 'Finishing Status', 'text', 5, true, true),
  ('rent_sale', 'إيجار / بيع', 'Rent / Sale', 'text', 6, true, true),
  ('unit_type', 'نوع الوحدة', 'Unit Type', 'text', 7, true, true),
  ('cash_required', 'المطلوب كاش', 'Cash Required', 'number', 8, true, true),
  ('remaining', 'المتبقي', 'Remaining', 'number', 9, true, true),
  ('last_contact_date', 'تاريخ آخر تواصل', 'Last Contact', 'date', 10, true, true),
  ('additional_notes', 'ملاحظات إضافية', 'Additional Notes', 'textarea', 11, true, true),
  ('feedback', 'فيد باك', 'Feedback', 'textarea', 12, true, true)
on conflict (key) do nothing;
