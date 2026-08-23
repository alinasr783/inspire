import { z } from "zod";

const invalidIdMsg = "معرّف غير صالح | Invalid id";

export const idSchema = z.object({
  id: z.string().uuid(invalidIdMsg),
});

const sortByUnits = z.enum(["created_at", "updated_at", "cash_required", "remaining", "customer_name"]).optional().default("created_at");
const sortByClients = z.enum(["created_at", "updated_at", "budget_from", "seriousness_rating", "customer_name"]).optional().default("created_at");
const sortOrder = z.enum(["asc", "desc"]).optional().default("desc");

const paginationSchema = {
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
};

export const searchUnitsSchema = z.object({
  query: z.string().trim().optional().describe(
    "بحث نصي عام في الاسم والهاتف والكمبوند والملاحظات وردود الفعل | Free-text search over name, phone, compound, notes and feedback"
  ),
  customer_name: z.string().trim().optional().describe("اسم العميل (بحث جزئي) | Customer name (partial match)"),
  phone: z.string().trim().optional().describe("رقم الهاتف (بحث جزئي) | Phone number (partial match)"),
  compound_name: z.string().trim().optional().describe("اسم الكمبوند / الشركة (بحث جزئي) | Compound / developer name (partial match)"),
  area: z.string().trim().optional().describe("المنطقة (بحث جزئي) | Area (partial match)"),
  building_number: z.string().trim().optional().describe("رقم العمارة | Building number"),
  finishing_status: z.string().trim().optional().describe(
    "حالة التشطيب (مطابقة تامة): راو، نصف تشطيب، تشطيب كامل، تحت الإنشاء | Finishing status (exact): raw, semi-finished, fully-finished, under-construction"
  ),
  rent_sale: z.string().trim().optional().describe("نوع التعامل (مطابقة تامة): بيع أو إيجار | Rent/sale (exact): بيع or إيجار"),
  unit_type: z.string().trim().optional().describe("نوع الوحدة (مطابقة تامة) | Unit type (exact)"),
  assigned_employee: z.string().trim().optional().describe("معرّف الموظف المسؤول | Assigned employee id"),
  created_by: z.string().trim().optional().describe("معرّف منشئ السجل | Id of the record creator"),
  cash_required_min: z.coerce.number().optional().describe("الحد الأدنى للمبلغ النقدي | Minimum cash required"),
  cash_required_max: z.coerce.number().optional().describe("الحد الأقصى للمبلغ النقدي | Maximum cash required"),
  remaining_min: z.coerce.number().optional().describe("الحد الأدنى للمتبقي | Minimum remaining amount"),
  remaining_max: z.coerce.number().optional().describe("الحد الأقصى للمتبقي | Maximum remaining amount"),
  last_contact_from: z.string().trim().optional().describe("تاريخ آخر تواصل من (YYYY-MM-DD) | Last contact date from"),
  last_contact_to: z.string().trim().optional().describe("تاريخ آخر تواصل إلى (YYYY-MM-DD) | Last contact date to"),
  duplicate_phone: z.coerce.boolean().optional().describe(
    "إن كان صحيحًا يرجع فقط السجلات التي يتكرر هاتفها مع سجل آخر | If true, return only records whose phone appears in more than one record"
  ),
  custom_fields: z.record(z.string(), z.string()).optional().describe(
    "تصفية على الحقول المخصصة (مطابقة جزئية على القيمة) | Filter on custom fields (partial match on value)"
  ),
  sort_by: sortByUnits,
  sort_order: sortOrder,
  ...paginationSchema,
});

export const createUnitSchema = z.object({
  customer_name: z.string().trim().min(1, "اسم العميل مطلوب | Customer name is required"),
  phone: z.string().trim().min(1, "رقم الهاتف مطلوب | Phone is required"),
  compound_name: z.string().trim().min(1, "اسم الكمبوند مطلوب | Compound name is required"),
  area: z.string().trim().optional().default(""),
  building_number: z.string().trim().optional().default(""),
  finishing_status: z.string().trim().optional().default(""),
  rent_sale: z.string().trim().optional().default(""),
  unit_type: z.string().trim().optional().default(""),
  cash_required: z.coerce.number().positive().optional(),
  remaining: z.coerce.number().positive().optional(),
  last_contact_date: z.string().trim().optional(),
  additional_notes: z.string().trim().optional().default(""),
  feedback: z.string().trim().optional().default(""),
  assigned_employee: z.string().trim().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateUnitSchema = z
  .object({
    id: z.string().uuid(invalidIdMsg),
  })
  .merge(
    z.object({
      customer_name: z.string().trim().min(1).optional(),
      phone: z.string().trim().min(1).optional(),
      compound_name: z.string().trim().min(1).optional(),
      area: z.string().trim().optional(),
      building_number: z.string().trim().optional(),
      finishing_status: z.string().trim().optional(),
      rent_sale: z.string().trim().optional(),
      unit_type: z.string().trim().optional(),
      cash_required: z.coerce.number().positive().nullable().optional(),
      remaining: z.coerce.number().positive().nullable().optional(),
      last_contact_date: z.string().trim().nullable().optional(),
      additional_notes: z.string().trim().optional(),
      feedback: z.string().trim().optional(),
      assigned_employee: z.string().trim().nullable().optional(),
      custom_fields: z.record(z.string(), z.unknown()).optional(),
    })
  );

export const searchClientsSchema = z.object({
  query: z.string().trim().optional().describe(
    "بحث نصي عام في الاسم والهاتف والهاتف البديل والملاحظات | Free-text search over name, phone, alt-phone and notes"
  ),
  customer_name: z.string().trim().optional().describe("اسم العميل (بحث جزئي) | Customer name (partial match)"),
  phone: z.string().trim().optional().describe("رقم الهاتف (بحث جزئي) | Phone number (partial match)"),
  phone_alt: z.string().trim().optional().describe("الهاتف البديل (بحث جزئي) | Alternative phone (partial match)"),
  payment_method: z.string().trim().optional().describe(
    "طريقة الدفع (مطابقة تامة): كاش، تقسيط | Payment method (exact): كاش, تقسيط"
  ),
  preferred_area: z.string().trim().optional().describe("المنطقة المفضلة (بحث جزئي) | Preferred area (partial match)"),
  unit_type: z.string().trim().optional().describe("نوع الوحدة (مطابقة تامة) | Unit type (exact)"),
  bedrooms: z.string().trim().optional().describe("عدد الغرف | Bedrooms"),
  preferred_developer: z.string().trim().optional().describe("المطور المفضل (بحث جزئي) | Preferred developer (partial match)"),
  source: z.string().trim().optional().describe(
    "مصدر العميل (مطابقة تامة): Road، Facebook، Instagram، TikTok، معرض، فيس، انستجرام، تيك توك | Source (exact)"
  ),
  assigned_employee: z.string().trim().optional().describe("معرّف الموظف المسؤول | Assigned employee id"),
  created_by: z.string().trim().optional().describe("معرّف منشئ السجل | Id of the record creator"),
  budget_min: z.coerce.number().optional().describe("الحد الأدنى للميزانية | Minimum budget"),
  budget_max: z.coerce.number().optional().describe("الحد الأقصى للميزانية | Maximum budget"),
  last_contact_from: z.string().trim().optional().describe("تاريخ آخر تواصل من (YYYY-MM-DD) | Last contact date from"),
  last_contact_to: z.string().trim().optional().describe("تاريخ آخر تواصل إلى (YYYY-MM-DD) | Last contact date to"),
  seriousness_min: z.coerce.number().int().min(1).max(10).optional().describe("الحد الأدنى لمعدل الجدية (1-10) | Minimum seriousness rating"),
  seriousness_max: z.coerce.number().int().min(1).max(10).optional().describe("الحد الأقصى لمعدل الجدية (1-10) | Maximum seriousness rating"),
  is_company_client: z.coerce.boolean().optional().default(false).describe(
    "هل هو عميل شركة؟ (الافتراضي: فرد) | Is it a company client? (default: individual)"
  ),
  custom_fields: z.record(z.string(), z.string()).optional().describe(
    "تصفية على الحقول المخصصة (مطابقة جزئية على القيمة) | Filter on custom fields (partial match on value)"
  ),
  sort_by: sortByClients,
  sort_order: sortOrder,
  ...paginationSchema,
});

export const createClientSchema = z.object({
  customer_name: z.string().trim().min(1, "اسم العميل مطلوب | Customer name is required"),
  phone: z.string().trim().min(1, "رقم الهاتف مطلوب | Phone is required"),
  phone_alt: z.string().trim().optional(),
  budget_from: z.coerce.number().positive().optional(),
  budget_to: z.coerce.number().positive().optional(),
  payment_method: z.string().trim().optional(),
  preferred_area: z.string().trim().optional(),
  unit_type: z.string().trim().optional(),
  bedrooms: z.string().trim().optional(),
  preferred_developer: z.string().trim().optional(),
  source: z.string().trim().optional(),
  additional_notes: z.string().trim().optional(),
  last_contact_date: z.string().trim().optional(),
  assigned_employee: z.string().trim().optional(),
  seriousness_rating: z.coerce.number().int().min(1).max(10).optional().default(5),
  custom_fields: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateClientSchema = z
  .object({
    id: z.string().uuid(invalidIdMsg),
  })
  .merge(
    z.object({
      customer_name: z.string().trim().min(1).optional(),
      phone: z.string().trim().min(1).optional(),
      phone_alt: z.string().trim().nullable().optional(),
      budget_from: z.coerce.number().positive().nullable().optional(),
      budget_to: z.coerce.number().positive().nullable().optional(),
      payment_method: z.string().trim().nullable().optional(),
      preferred_area: z.string().trim().nullable().optional(),
      unit_type: z.string().trim().nullable().optional(),
      bedrooms: z.string().trim().nullable().optional(),
      preferred_developer: z.string().trim().nullable().optional(),
      source: z.string().trim().nullable().optional(),
      additional_notes: z.string().trim().nullable().optional(),
      last_contact_date: z.string().trim().nullable().optional(),
      assigned_employee: z.string().trim().nullable().optional(),
      seriousness_rating: z.coerce.number().int().min(1).max(10).optional(),
      custom_fields: z.record(z.string(), z.unknown()).optional(),
    })
  );

export type SearchUnitsParams = z.infer<typeof searchUnitsSchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type UpdateUnitPayload = Omit<UpdateUnitInput, "id">;
export type SearchClientsParams = z.infer<typeof searchClientsSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type UpdateClientPayload = Omit<UpdateClientInput, "id">;
