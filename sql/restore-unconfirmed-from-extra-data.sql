-- =====================================================================
-- 1. إضافة أعمدة الموظف الاحتياطي وفيد باك الموظف الاحتياطي (إن لم تكن مضافة)
-- =====================================================================
ALTER TABLE public.unconfirmed_records
ADD COLUMN IF NOT EXISTS backup_employee uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.unconfirmed_records
ADD COLUMN IF NOT EXISTS backup_feedback text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_unconfirmed_records_backup_employee
ON public.unconfirmed_records(backup_employee);

-- =====================================================================
-- 2. استرجاع وملء الأعمدة القياسية في جدول unconfirmed_records من حقل extra_data
--    (دون المساس بمحتويات extra_data أو روابط الملفات والفولدرات)
-- =====================================================================
DO $$
DECLARE
  rec RECORD;
  k TEXT;
  v TEXT;
  cleaned TEXT;
  new_owner_name TEXT;
  new_unit_area TEXT;
  new_building_number TEXT;
  new_unit_number TEXT;
  new_owner_phone TEXT;
  new_owner_phone_alt TEXT;
  new_affiliated_company TEXT;
  new_last_feedback TEXT;
  new_last_contact_date TEXT;
  new_phone_norm TEXT;
  new_phone_alt_norm TEXT;
  digits TEXT;
BEGIN
  FOR rec IN
    SELECT id,
           COALESCE(owner_name, '') AS owner_name,
           COALESCE(unit_area, '') AS unit_area,
           COALESCE(building_number, '') AS building_number,
           COALESCE(unit_number, '') AS unit_number,
           COALESCE(owner_phone, '') AS owner_phone,
           COALESCE(owner_phone_alt, '') AS owner_phone_alt,
           COALESCE(affiliated_company, '') AS affiliated_company,
           COALESCE(last_feedback, '') AS last_feedback,
           COALESCE(last_contact_date, '') AS last_contact_date,
           COALESCE(phone_normalized, '') AS phone_normalized,
           COALESCE(phone_alt_normalized, '') AS phone_alt_normalized,
           extra_data
    FROM public.unconfirmed_records
    WHERE extra_data IS NOT NULL
      AND jsonb_typeof(extra_data) = 'object'
      AND extra_data <> '{}'::jsonb
  LOOP
    new_owner_name := btrim(rec.owner_name);
    new_unit_area := btrim(rec.unit_area);
    new_building_number := btrim(rec.building_number);
    new_unit_number := btrim(rec.unit_number);
    new_owner_phone := btrim(rec.owner_phone);
    new_owner_phone_alt := btrim(rec.owner_phone_alt);
    new_affiliated_company := btrim(rec.affiliated_company);
    new_last_feedback := btrim(rec.last_feedback);
    new_last_contact_date := btrim(rec.last_contact_date);

    -- المرحلة 1: مطابقة أسماء الأعمدة داخل extra_data
    FOR k, v IN SELECT key, btrim(COALESCE(value, '')) FROM jsonb_each_text(rec.extra_data)
    LOOP
      CONTINUE WHEN v = '';
      -- تجاهل الأعمدة الفارغة الاسم في المرحلة الأولى (تُعالج في المرحلة الثانية كأرقام هواتف)
      CONTINUE WHEN k ~ '^(\s*__EMPTY(_\d+)?\s*|\s*_\d+\s*|\s*)$';

      cleaned := btrim(
        regexp_replace(
          translate(
            lower(k),
            'أإآٱةىؤئ_-/:()[]{}.,#\|',
            'اااااهيوي               '
          ),
          '\s+', ' ', 'g'
        )
      );

      IF new_owner_name = '' AND (
        cleaned IN ('owner name', 'owner', 'customer name', 'customer', 'client name', 'client', 'name', 'full name',
                    'المالك', 'اسم المالك', 'العميل', 'اسم العميل', 'الاسم', 'اسم', 'الاسم بالكامل', 'صاحب الوحده', 'اسم صاحب الوحده', 'المشتري', 'اسم المشتري')
        OR cleaned LIKE '%اسم المالك%' OR cleaned LIKE '%اسم العميل%' OR cleaned LIKE '%صاحب الوحده%' OR cleaned LIKE '%الاسم%'
      ) THEN
        new_owner_name := v;

      ELSIF new_unit_area = '' AND (
        cleaned IN ('unit area', 'area', 'area sqm', 'property area', 'sqm', 'size', 'bua',
                    'المساحه', 'مساحه الوحده', 'مساحه', 'مساحه الشقه', 'مساحه الارض', 'المتر', 'متر')
        OR cleaned LIKE '%مساحه%' OR cleaned LIKE '%area%'
      ) THEN
        new_unit_area := v;

      ELSIF new_building_number = '' AND (
        cleaned IN ('building number', 'building no', 'building', 'block', 'block number', 'bldg',
                    'رقم المبني', 'رقم العماره', 'المبني', 'مبني', 'العماره', 'عماره', 'رقم العقار', 'العقار', 'رقم البلوك', 'البلوك', 'بلوك', 'رقم القطعه', 'القطعه', 'قطعه', 'رقم الفيلا', 'الفيلا', 'فيلا')
        OR cleaned LIKE '%عماره%' OR cleaned LIKE '%مبني%' OR cleaned LIKE '%بلوك%' OR cleaned LIKE '%building%'
      ) THEN
        new_building_number := v;

      ELSIF new_unit_number = '' AND (
        cleaned IN ('unit number', 'unit no', 'unit', 'apartment number', 'apartment no', 'flat no', 'apartment', 'flat', 'apt',
                    'رقم الوحده', 'الوحده', 'وحده', 'رقم الشقه', 'الشقه', 'شقه', 'كود الوحده')
        OR cleaned LIKE '%وحده%' OR cleaned LIKE '%شقه%' OR cleaned LIKE '%apartment%'
      ) THEN
        new_unit_number := v;

      ELSIF (
        cleaned LIKE '%هاتف%' OR cleaned LIKE '%تليفون%' OR cleaned LIKE '%موبايل%' OR cleaned LIKE '%موبيل%'
        OR cleaned LIKE '%جوال%' OR cleaned LIKE '%تواصل%' OR cleaned LIKE '%واتس%'
        OR cleaned LIKE '%phone%' OR cleaned LIKE '%mobile%' OR cleaned LIKE '%tel%'
        OR (cleaned IN ('الرقم', 'رقم', 'رقم المالك', 'رقم العميل', 'رقم 1', 'رقم1', 'رقم 2', 'رقم2', 'رقم بديل', 'رقم اخر') AND length(regexp_replace(v, '\D', '', 'g')) >= 7)
      ) THEN
        IF cleaned LIKE '%2%' OR cleaned LIKE '%بديل%' OR cleaned LIKE '%اخر%' OR cleaned LIKE '%ثاني%' OR cleaned LIKE '%alt%' THEN
          IF new_owner_phone_alt = '' THEN
            new_owner_phone_alt := v;
          END IF;
        ELSE
          IF new_owner_phone = '' THEN
            new_owner_phone := v;
          ELSIF new_owner_phone_alt = '' AND new_owner_phone <> v THEN
            new_owner_phone_alt := v;
          END IF;
        END IF;

      ELSIF new_affiliated_company = '' AND (
        cleaned IN ('affiliated company', 'company', 'developer', 'company name', 'compound', 'project',
                    'شركه', 'الشركه', 'الشركه التابعه', 'المطور', 'الشركه المطوره', 'شركه المطور', 'الكمبوند', 'كمبوند', 'المشروع', 'مشروع', 'اسم المشروع', 'اسم الكمبوند', 'اسم الشركه', 'القريه', 'المرحله', 'المنطقه')
        OR cleaned LIKE '%شركه%' OR cleaned LIKE '%كمبوند%' OR cleaned LIKE '%مشروع%' OR cleaned LIKE '%مطور%' OR cleaned LIKE '%company%' OR cleaned LIKE '%compound%'
      ) THEN
        new_affiliated_company := v;

      ELSIF new_last_feedback = '' AND (
        cleaned IN ('last feedback', 'feedback', 'notes', 'note', 'comment', 'comments',
                    'ملاحظات', 'الملاحظات', 'ملاحظه', 'فيدباك', 'فيد باك', 'التعليق', 'تعليق', 'رد العميل', 'حاله العميل')
      ) THEN
        new_last_feedback := v;

      ELSIF new_last_contact_date = '' AND (
        cleaned IN ('last contact date', 'contact date', 'date', 'last contacted',
                    'تاريخ', 'التاريخ', 'اخر تاريخ تواصل', 'تاريخ الاتصال', 'اخر تواصل', 'تاريخ التواصل')
      ) THEN
        new_last_contact_date := v;
      END IF;
    END LOOP;

    -- المرحلة 2: الأعمدة ذات الترويسة الفارغة ("", "_1", "__EMPTY", "__EMPTY_1") تملأ خانات الهاتف
    FOR k, v IN SELECT key, btrim(COALESCE(value, '')) FROM jsonb_each_text(rec.extra_data)
    LOOP
      CONTINUE WHEN v = '';
      IF k ~ '^(\s*__EMPTY(_\d+)?\s*|\s*_\d+\s*|\s*)$' THEN
        IF new_owner_phone = '' THEN
          new_owner_phone := v;
        ELSIF new_owner_phone_alt = '' AND new_owner_phone <> v THEN
          new_owner_phone_alt := v;
        END IF;
      END IF;
    END LOOP;

    -- تطبيع أرقام الهواتف المصرية
    new_phone_norm := btrim(rec.phone_normalized);
    IF new_owner_phone <> '' THEN
      digits := regexp_replace(new_owner_phone, '\D', '', 'g');
      IF length(digits) = 10 AND substring(digits FROM 1 FOR 2) IN ('10', '11', '12', '15') THEN
        new_phone_norm := '0' || digits;
      ELSIF length(digits) = 11 AND substring(digits FROM 1 FOR 3) IN ('010', '011', '012', '015') THEN
        new_phone_norm := digits;
      ELSIF length(digits) = 12 AND substring(digits FROM 1 FOR 4) IN ('2010', '2011', '2012', '2015') THEN
        new_phone_norm := '0' || substring(digits FROM 3);
      ELSIF new_phone_norm = '' THEN
        new_phone_norm := new_owner_phone;
      END IF;
    END IF;

    new_phone_alt_norm := btrim(rec.phone_alt_normalized);
    IF new_owner_phone_alt <> '' THEN
      digits := regexp_replace(new_owner_phone_alt, '\D', '', 'g');
      IF length(digits) = 10 AND substring(digits FROM 1 FOR 2) IN ('10', '11', '12', '15') THEN
        new_phone_alt_norm := '0' || digits;
      ELSIF length(digits) = 11 AND substring(digits FROM 1 FOR 3) IN ('010', '011', '012', '015') THEN
        new_phone_alt_norm := digits;
      ELSIF length(digits) = 12 AND substring(digits FROM 1 FOR 4) IN ('2010', '2011', '2012', '2015') THEN
        new_phone_alt_norm := '0' || substring(digits FROM 3);
      ELSIF new_phone_alt_norm = '' THEN
        new_phone_alt_norm := new_owner_phone_alt;
      END IF;
    END IF;

    IF new_owner_name <> btrim(rec.owner_name)
       OR new_unit_area <> btrim(rec.unit_area)
       OR new_building_number <> btrim(rec.building_number)
       OR new_unit_number <> btrim(rec.unit_number)
       OR new_owner_phone <> btrim(rec.owner_phone)
       OR new_owner_phone_alt <> btrim(rec.owner_phone_alt)
       OR new_affiliated_company <> btrim(rec.affiliated_company)
       OR new_last_feedback <> btrim(rec.last_feedback)
       OR new_last_contact_date <> btrim(rec.last_contact_date)
       OR new_phone_norm <> btrim(rec.phone_normalized)
       OR new_phone_alt_norm <> btrim(rec.phone_alt_normalized)
    THEN
      UPDATE public.unconfirmed_records
      SET owner_name = new_owner_name,
          unit_area = new_unit_area,
          building_number = new_building_number,
          unit_number = new_unit_number,
          owner_phone = new_owner_phone,
          owner_phone_alt = new_owner_phone_alt,
          affiliated_company = new_affiliated_company,
          last_feedback = new_last_feedback,
          last_contact_date = new_last_contact_date,
          phone_normalized = new_phone_norm,
          phone_alt_normalized = new_phone_alt_norm
      WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
