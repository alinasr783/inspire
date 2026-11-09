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
-- 2. استرجاع وملء كافة الأعمدة القياسية في جدول unconfirmed_records من حقل extra_data
--    وتصحيح الأعمدة التي وُضعت بالخطأ (مثل اسم العميل الموضوع في owner_phone
--    أو المساحة الموضوعة في owner_phone_alt)
-- =====================================================================
DO $$
DECLARE
  rec RECORD;
  extra_obj JSONB;
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
  fb_list TEXT[];
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
  LOOP
    -- فك extra_data سواء كانت كائن jsonb أو نصاً مشفراً (JSON string scalar)
    IF jsonb_typeof(rec.extra_data) = 'string' THEN
      BEGIN
        extra_obj := (rec.extra_data #>> '{}')::jsonb;
      EXCEPTION WHEN OTHERS THEN
        extra_obj := '{}'::jsonb;
      END;
    ELSIF jsonb_typeof(rec.extra_data) = 'object' THEN
      extra_obj := rec.extra_data;
    ELSE
      extra_obj := '{}'::jsonb;
    END IF;

    new_owner_name := btrim(rec.owner_name);
    new_unit_area := btrim(rec.unit_area);
    new_building_number := btrim(rec.building_number);
    new_unit_number := btrim(rec.unit_number);
    new_owner_phone := btrim(rec.owner_phone);
    new_owner_phone_alt := btrim(rec.owner_phone_alt);
    new_affiliated_company := btrim(rec.affiliated_company);
    new_last_feedback := btrim(rec.last_feedback);
    new_last_contact_date := btrim(rec.last_contact_date);

    -- -----------------------------------------------------------------
    -- تصحيح الحقول الموضوعة بالخطأ:
    -- إذا كان owner_phone يحتوي على أحرف نصية ولديه أقل من 6 أرقام، فهو في الحقيقة اسم المالك!
    -- -----------------------------------------------------------------
    digits := regexp_replace(new_owner_phone, '\D', '', 'g');
    IF new_owner_phone ~ '[a-zA-Z\u0600-\u06FF]' AND length(digits) < 6 THEN
      IF new_owner_name = '' THEN
        new_owner_name := new_owner_phone;
      END IF;
      new_owner_phone := '';
    END IF;

    -- إذا كان owner_phone_alt رقماً صغيراً (مثل مساحة 59 أو 121) ولديه أقل من 6 أرقام
    digits := regexp_replace(new_owner_phone_alt, '\D', '', 'g');
    IF new_owner_phone_alt <> '' AND (length(digits) < 6 OR new_owner_phone_alt ~ '[a-zA-Z\u0600-\u06FF]') THEN
      IF new_unit_area = '' AND new_owner_phone_alt ~ '^\d{1,4}$' THEN
        new_unit_area := new_owner_phone_alt;
      END IF;
      new_owner_phone_alt := '';
    END IF;

    -- -----------------------------------------------------------------
    -- استخراج بيانات الملفات ذات الترويسات الفارغة (__EMPTY, __EMPTY_1, ...)
    -- -----------------------------------------------------------------
    IF extra_obj ? '__EMPTY' AND new_owner_name = '' THEN
      v := btrim(COALESCE(extra_obj->>'__EMPTY', ''));
      IF v <> '' AND length(regexp_replace(v, '\D', '', 'g')) < 6 THEN
        new_owner_name := v;
      END IF;
    END IF;

    IF extra_obj ? '__EMPTY_1' AND new_unit_area = '' THEN
      v := btrim(COALESCE(extra_obj->>'__EMPTY_1', ''));
      IF v ~ '^\d{1,4}(\.\d+)?$' THEN
        new_unit_area := v;
      END IF;
    END IF;

    IF extra_obj ? '__EMPTY_3' AND new_unit_number = '' THEN
      v := btrim(COALESCE(extra_obj->>'__EMPTY_3', ''));
      IF v <> '' THEN
        new_unit_number := v;
      END IF;
    END IF;

    IF extra_obj ? '__EMPTY_4' AND new_building_number = '' THEN
      v := btrim(COALESCE(extra_obj->>'__EMPTY_4', ''));
      IF v <> '' THEN
        new_building_number := v;
      END IF;
    END IF;

    IF extra_obj ? '__EMPTY_5' AND new_owner_phone = '' THEN
      v := btrim(COALESCE(extra_obj->>'__EMPTY_5', ''));
      digits := regexp_replace(v, '\D', '', 'g');
      IF length(digits) >= 8 THEN
        new_owner_phone := v;
      END IF;
    END IF;

    IF extra_obj ? '__EMPTY_6' AND new_owner_phone_alt = '' THEN
      v := btrim(COALESCE(extra_obj->>'__EMPTY_6', ''));
      digits := regexp_replace(v, '\D', '', 'g');
      IF length(digits) >= 8 AND v <> new_owner_phone THEN
        new_owner_phone_alt := v;
      END IF;
    END IF;

    IF new_last_feedback = '' THEN
      fb_list := ARRAY[]::TEXT[];
      v := btrim(COALESCE(extra_obj->>'__EMPTY_22', ''));
      IF v <> '' THEN fb_list := array_append(fb_list, v); END IF;
      v := btrim(COALESCE(extra_obj->>'__EMPTY_21', ''));
      IF v <> '' THEN fb_list := array_append(fb_list, v); END IF;
      v := btrim(COALESCE(extra_obj->>'__EMPTY_19', ''));
      IF v <> '' THEN fb_list := array_append(fb_list, v); END IF;
      IF array_length(fb_list, 1) > 0 THEN
        new_last_feedback := array_to_string(fb_list, ' - ');
      END IF;
    END IF;

    IF extra_obj ? '__EMPTY_25' AND new_last_contact_date = '' THEN
      v := btrim(COALESCE(extra_obj->>'__EMPTY_25', ''));
      IF v <> '' THEN
        new_last_contact_date := v;
      END IF;
    END IF;

    -- -----------------------------------------------------------------
    -- البحث عن أرقام الهواتف بالقيمة من أي عمود في extra_data
    -- -----------------------------------------------------------------
    IF new_owner_phone = '' OR new_owner_phone_alt = '' THEN
      FOR k, v IN SELECT key, btrim(COALESCE(value, '')) FROM jsonb_each_text(extra_obj)
      LOOP
        CONTINUE WHEN v = '';
        digits := regexp_replace(v, '\D', '', 'g');
        IF (length(digits) >= 10 AND length(digits) <= 15)
           OR (length(digits) >= 8 AND (digits ~ '^01' OR digits ~ '^1[0125]' OR digits ~ '^20' OR v ~ '^\+'))
        THEN
          IF new_owner_phone = '' THEN
            new_owner_phone := v;
          ELSIF new_owner_phone_alt = '' AND new_owner_phone <> v THEN
            new_owner_phone_alt := v;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- -----------------------------------------------------------------
    -- مطابقة أسماء الأعمدة العربية والإنجليزية في extra_data
    -- -----------------------------------------------------------------
    FOR k, v IN SELECT key, btrim(COALESCE(value, '')) FROM jsonb_each_text(extra_obj)
    LOOP
      CONTINUE WHEN v = '';
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

    -- -----------------------------------------------------------------
    -- تطبيع أرقام الهواتف المصرية
    -- -----------------------------------------------------------------
    new_phone_norm := '';
    IF new_owner_phone <> '' THEN
      digits := regexp_replace(new_owner_phone, '\D', '', 'g');
      IF length(digits) = 10 AND substring(digits FROM 1 FOR 2) IN ('10', '11', '12', '15') THEN
        new_phone_norm := '0' || digits;
      ELSIF length(digits) = 11 AND substring(digits FROM 1 FOR 3) IN ('010', '011', '012', '015') THEN
        new_phone_norm := digits;
      ELSIF length(digits) = 12 AND substring(digits FROM 1 FOR 4) IN ('2010', '2011', '2012', '2015') THEN
        new_phone_norm := '0' || substring(digits FROM 3);
      ELSE
        new_phone_norm := new_owner_phone;
      END IF;
    END IF;

    new_phone_alt_norm := '';
    IF new_owner_phone_alt <> '' THEN
      digits := regexp_replace(new_owner_phone_alt, '\D', '', 'g');
      IF length(digits) = 10 AND substring(digits FROM 1 FOR 2) IN ('10', '11', '12', '15') THEN
        new_phone_alt_norm := '0' || digits;
      ELSIF length(digits) = 11 AND substring(digits FROM 1 FOR 3) IN ('010', '011', '012', '015') THEN
        new_phone_alt_norm := digits;
      ELSIF length(digits) = 12 AND substring(digits FROM 1 FOR 4) IN ('2010', '2011', '2012', '2015') THEN
        new_phone_alt_norm := '0' || substring(digits FROM 3);
      ELSE
        new_phone_alt_norm := new_owner_phone_alt;
      END IF;
    END IF;

    -- تحديث السجل في قاعدة البيانات
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
        phone_alt_normalized = new_phone_alt_norm,
        extra_data = extra_obj
    WHERE id = rec.id;
  END LOOP;
END $$;
