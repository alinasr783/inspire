import type { z } from "zod";
import {
  createClientSchema,
  createUnitSchema,
  idSchema,
  searchClientsSchema,
  searchUnitsSchema,
  updateClientSchema,
  updateUnitSchema,
} from "@/lib/mcp/schemas";
import { DESC } from "@/lib/mcp/descriptions";
import {
  createClient,
  deleteClient,
  getClientById,
  searchClients,
  updateClient,
} from "@/lib/mcp/data/clients";
import {
  createUnit,
  deleteUnit,
  getUnitById,
  searchUnits,
  updateUnit,
} from "@/lib/mcp/data/units";

export type AssistantToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  schema: z.ZodType;
};

const paginationProps = {
  limit: { type: "number", description: "عدد النتائج (الحد الأقصى 500) | Page size (max 500)", maximum: 500 },
  offset: { type: "number", description: "تخطي عدد من النتائج | Results to skip" },
};

export const TOOL_DEFS: AssistantToolDef[] = [
  {
    name: "search_units",
    description: DESC.searchUnits,
    schema: searchUnitsSchema,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "بحث نصي عام في الاسم والهاتف والكمبوند والملاحظات" },
        customer_name: { type: "string", description: "اسم العميل (بحث جزئي)" },
        phone: { type: "string", description: "رقم الهاتف (بحث جزئي)" },
        compound_name: { type: "string", description: "اسم الكمبوند (بحث جزئي)" },
        area: { type: "string", description: "المنطقة (بحث جزئي)" },
        building_number: { type: "string", description: "رقم العمارة" },
        finishing_status: { type: "string", enum: ["راو", "نصف تشطيب", "تشطيب كامل", "تحت الإنشاء"], description: "حالة التشطيب" },
        rent_sale: { type: "string", enum: ["بيع", "إيجار"], description: "نوع التعامل" },
        unit_type: { type: "string", description: "نوع الوحدة" },
        assigned_employee: { type: "string", description: "معرّف الموظف المسؤول" },
        created_by: { type: "string", description: "معرّف منشئ السجل" },
        cash_required_min: { type: "number", description: "الحد الأدنى للمبلغ النقدي" },
        cash_required_max: { type: "number", description: "الحد الأقصى للمبلغ النقدي" },
        remaining_min: { type: "number", description: "الحد الأدنى للمتبقي" },
        remaining_max: { type: "number", description: "الحد الأقصى للمتبقي" },
        last_contact_from: { type: "string", description: "تاريخ آخر تواصل من (YYYY-MM-DD)" },
        last_contact_to: { type: "string", description: "تاريخ آخر تواصل إلى (YYYY-MM-DD)" },
        duplicate_phone: { type: "boolean", description: "الهواتف المكررة فقط" },
        custom_fields: { type: "object", description: "تصفية على الحقول المخصصة (المفتاح: القيمة)" },
        sort_by: { type: "string", enum: ["created_at", "updated_at", "cash_required", "remaining", "customer_name"] },
        sort_order: { type: "string", enum: ["asc", "desc"] },
        ...paginationProps,
      },
    },
  },
  {
    name: "get_unit",
    description: DESC.getUnit,
    schema: idSchema,
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "المعرّف الفريد للعقار" } },
      required: ["id"],
    },
  },
  {
    name: "create_unit",
    description: DESC.createUnit,
    schema: createUnitSchema,
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "اسم العميل (مطلوب)" },
        phone: { type: "string", description: "رقم الهاتف (مطلوب)" },
        compound_name: { type: "string", description: "اسم الكمبوند (مطلوب)" },
        area: { type: "string", description: "المنطقة" },
        building_number: { type: "string" },
        finishing_status: { type: "string", enum: ["راو", "نصف تشطيب", "تشطيب كامل", "تحت الإنشاء"] },
        rent_sale: { type: "string", enum: ["بيع", "إيجار"] },
        unit_type: { type: "string" },
        cash_required: { type: "number", description: "المبلغ النقدي" },
        remaining: { type: "number", description: "المتبقي" },
        last_contact_date: { type: "string", description: "تاريخ آخر تواصل (YYYY-MM-DD)" },
        additional_notes: { type: "string" },
        feedback: { type: "string" },
        assigned_employee: { type: "string", description: "معرّف الموظف المسؤول" },
        custom_fields: { type: "object" },
      },
      required: ["customer_name", "phone", "compound_name"],
    },
  },
  {
    name: "update_unit",
    description: DESC.updateUnit,
    schema: updateUnitSchema,
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "المعرّف الفريد للعقار (مطلوب)" },
        customer_name: { type: "string" },
        phone: { type: "string" },
        compound_name: { type: "string" },
        area: { type: "string" },
        building_number: { type: "string" },
        finishing_status: { type: "string", enum: ["راو", "نصف تشطيب", "تشطيب كامل", "تحت الإنشاء"] },
        rent_sale: { type: "string", enum: ["بيع", "إيجار"] },
        unit_type: { type: "string" },
        cash_required: { type: "number" },
        remaining: { type: "number" },
        last_contact_date: { type: "string" },
        additional_notes: { type: "string" },
        feedback: { type: "string" },
        assigned_employee: { type: "string" },
        custom_fields: { type: "object" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_unit",
    description: DESC.deleteUnit,
    schema: idSchema,
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "المعرّف الفريد للعقار" } },
      required: ["id"],
    },
  },
  {
    name: "search_clients",
    description: DESC.searchClients,
    schema: searchClientsSchema,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "بحث نصي عام في الاسم والهاتف والهاتف البديل والملاحظات" },
        customer_name: { type: "string" },
        phone: { type: "string" },
        phone_alt: { type: "string" },
        payment_method: { type: "string", enum: ["كاش", "تقسيط"], description: "طريقة الدفع" },
        preferred_area: { type: "string", description: "المنطقة المفضلة" },
        unit_type: { type: "string" },
        bedrooms: { type: "string" },
        preferred_developer: { type: "string" },
        source: { type: "string", enum: ["Road", "Facebook", "Instagram", "TikTok", "معرض", "فيس", "انستجرام", "تيك توك"], description: "مصدر العميل" },
        assigned_employee: { type: "string" },
        created_by: { type: "string" },
        budget_min: { type: "number", description: "الحد الأدنى للميزانية" },
        budget_max: { type: "number", description: "الحد الأقصى للميزانية" },
        last_contact_from: { type: "string" },
        last_contact_to: { type: "string" },
        seriousness_min: { type: "number", description: "الحد الأدنى لمعدل الجدية (1-10)" },
        seriousness_max: { type: "number", description: "الحد الأقصى لمعدل الجدية (1-10)" },
        is_company_client: { type: "boolean", description: "عملاء الشركات (الافتراضي: فرد)" },
        custom_fields: { type: "object" },
        sort_by: { type: "string", enum: ["created_at", "updated_at", "budget_from", "seriousness_rating", "customer_name"] },
        sort_order: { type: "string", enum: ["asc", "desc"] },
        ...paginationProps,
      },
    },
  },
  {
    name: "get_client",
    description: DESC.getClient,
    schema: idSchema,
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "المعرّف الفريد للعميل" } },
      required: ["id"],
    },
  },
  {
    name: "create_client",
    description: DESC.createClient,
    schema: createClientSchema,
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "اسم العميل (مطلوب)" },
        phone: { type: "string", description: "رقم الهاتف (مطلوب)" },
        phone_alt: { type: "string" },
        budget_from: { type: "number" },
        budget_to: { type: "number" },
        payment_method: { type: "string", enum: ["كاش", "تقسيط"] },
        preferred_area: { type: "string" },
        unit_type: { type: "string" },
        bedrooms: { type: "string" },
        preferred_developer: { type: "string" },
        source: { type: "string" },
        additional_notes: { type: "string" },
        last_contact_date: { type: "string" },
        assigned_employee: { type: "string" },
        seriousness_rating: { type: "number", description: "معدل الجدية (1-10)" },
        custom_fields: { type: "object" },
      },
      required: ["customer_name", "phone"],
    },
  },
  {
    name: "update_client",
    description: DESC.updateClient,
    schema: updateClientSchema,
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "المعرّف الفريد للعميل (مطلوب)" },
        customer_name: { type: "string" },
        phone: { type: "string" },
        phone_alt: { type: "string" },
        budget_from: { type: "number" },
        budget_to: { type: "number" },
        payment_method: { type: "string", enum: ["كاش", "تقسيط"] },
        preferred_area: { type: "string" },
        unit_type: { type: "string" },
        bedrooms: { type: "string" },
        preferred_developer: { type: "string" },
        source: { type: "string" },
        additional_notes: { type: "string" },
        last_contact_date: { type: "string" },
        assigned_employee: { type: "string" },
        seriousness_rating: { type: "number" },
        custom_fields: { type: "object" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_client",
    description: DESC.deleteClient,
    schema: idSchema,
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "المعرّف الفريد للعميل" } },
      required: ["id"],
    },
  },
];

export type ToolExecutionResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

function invalidError(error: z.ZodError): ToolExecutionResult {
  const details = error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return { ok: false, error: `مدخلات غير صحيحة | Invalid input: ${details}` };
}

function wrap(fn: () => Promise<unknown>): Promise<ToolExecutionResult> {
  return fn().then(
    (data) => ({ ok: true as const, data }),
    (error) => ({
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    })
  );
}

export async function executeTool(name: string, rawArgs: unknown): Promise<ToolExecutionResult> {
  switch (name) {
    case "search_units": {
      const parsed = searchUnitsSchema.safeParse(rawArgs);
      if (!parsed.success) return invalidError(parsed.error);
      return wrap(() => searchUnits(parsed.data));
    }
    case "get_unit": {
      const parsed = idSchema.safeParse(rawArgs);
      if (!parsed.success) return invalidError(parsed.error);
      return wrap(async () => {
        const unit = await getUnitById(parsed.data.id);
        if (!unit) throw new Error(`العقار غير موجود | Unit not found: ${parsed.data.id}`);
        return unit;
      });
    }
    case "create_unit": {
      const parsed = createUnitSchema.safeParse(rawArgs);
      if (!parsed.success) return invalidError(parsed.error);
      return wrap(() => createUnit(parsed.data));
    }
    case "update_unit": {
      const parsed = updateUnitSchema.safeParse(rawArgs);
      if (!parsed.success) return invalidError(parsed.error);
      const { id, ...payload } = parsed.data;
      return wrap(async () => {
        const unit = await updateUnit(id, payload);
        if (!unit) throw new Error(`العقار غير موجود | Unit not found: ${id}`);
        return unit;
      });
    }
    case "delete_unit": {
      const parsed = idSchema.safeParse(rawArgs);
      if (!parsed.success) return invalidError(parsed.error);
      return wrap(() => deleteUnit(parsed.data.id));
    }
    case "search_clients": {
      const parsed = searchClientsSchema.safeParse(rawArgs);
      if (!parsed.success) return invalidError(parsed.error);
      return wrap(() => searchClients(parsed.data));
    }
    case "get_client": {
      const parsed = idSchema.safeParse(rawArgs);
      if (!parsed.success) return invalidError(parsed.error);
      return wrap(async () => {
        const client = await getClientById(parsed.data.id);
        if (!client) throw new Error(`العميل غير موجود | Client not found: ${parsed.data.id}`);
        return client;
      });
    }
    case "create_client": {
      const parsed = createClientSchema.safeParse(rawArgs);
      if (!parsed.success) return invalidError(parsed.error);
      return wrap(() => createClient(parsed.data));
    }
    case "update_client": {
      const parsed = updateClientSchema.safeParse(rawArgs);
      if (!parsed.success) return invalidError(parsed.error);
      const { id, ...payload } = parsed.data;
      return wrap(async () => {
        const client = await updateClient(id, payload);
        if (!client) throw new Error(`العميل غير موجود | Client not found: ${id}`);
        return client;
      });
    }
    case "delete_client": {
      const parsed = idSchema.safeParse(rawArgs);
      if (!parsed.success) return invalidError(parsed.error);
      return wrap(() => deleteClient(parsed.data.id));
    }
    default:
      return { ok: false, error: `أداة غير معروفة | Unknown tool: ${name}` };
  }
}
