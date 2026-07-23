"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UnitRow = {
  id: string;
  customer_name: string;
  phone: string;
  compound_name: string;
  area: string | null;
  building_number: string | null;
  finishing_status: string | null;
  rent_sale: string | null;
  unit_type: string | null;
  cash_required: number | null;
  remaining: number | null;
  last_contact_date: string | null;
  additional_notes: string | null;
  feedback: string | null;
  custom_fields: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const unitSchema = z.object({
  customer_name: z.string().trim().min(1, "customer-name-required"),
  phone: z.string().trim().min(1, "phone-required"),
  compound_name: z.string().trim().min(1, "compound-name-required"),
  area: z.string().trim().default(""),
  building_number: z.string().trim().default(""),
  finishing_status: z.string().trim().default(""),
  rent_sale: z.string().trim().default(""),
  unit_type: z.string().trim().default(""),
  cash_required: z.coerce.number().positive().optional(),
  remaining: z.coerce.number().positive().optional(),
  last_contact_date: z.string().trim().optional(),
  additional_notes: z.string().trim().default(""),
  feedback: z.string().trim().default(""),
  custom_fields: z.record(z.string(), z.any()).optional().default({}),
});

export async function createUnit(formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const key of Object.keys(unitSchema.shape)) {
    if (key === "custom_fields") continue;
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  let customFields: Record<string, unknown> = {};
  const customFieldsRaw = formData.get("custom_fields");
  if (customFieldsRaw && typeof customFieldsRaw === "string") {
    try {
      customFields = JSON.parse(customFieldsRaw);
    } catch {
      customFields = {};
    }
  }

  const parsed = unitSchema.safeParse({ ...raw, custom_fields: customFields });
  if (!parsed.success) {
    redirect(`/${locale}/properties/new?error=validation`);
  }

  const { error } = await supabase.from("units").insert({
    ...parsed.data,
    created_by: user.id,
  });

  if (error) {
    redirect(`/${locale}/properties/new?error=create-failed`);
  }

  redirect(`/${locale}/properties`);
}

export async function updateUnit(id: string, formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const key of Object.keys(unitSchema.shape)) {
    if (key === "custom_fields") continue;
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  let customFields: Record<string, unknown> = {};
  const customFieldsRaw = formData.get("custom_fields");
  if (customFieldsRaw && typeof customFieldsRaw === "string") {
    try {
      customFields = JSON.parse(customFieldsRaw);
    } catch {
      customFields = {};
    }
  }

  const parsed = unitSchema.safeParse({ ...raw, custom_fields: customFields });
  if (!parsed.success) {
    redirect(`/${locale}/properties/${id}?error=validation`);
  }

  const { data: existing } = await supabase
    .from("units")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    redirect(`/${locale}/properties?error=not-found`);
  }

  if (existing.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      redirect(`/${locale}/properties/${id}?error=unauthorized`);
    }
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("units")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/${locale}/properties/${id}?error=update-failed`);
  }

  redirect(`/${locale}/properties/${id}`);
}

export async function deleteUnit(id: string) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const { data: existing } = await supabase
    .from("units")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    redirect(`/${locale}/properties?error=not-found`);
  }

  if (existing.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      redirect(`/${locale}/properties?error=unauthorized`);
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("units").delete().eq("id", id);

  if (error) {
    redirect(`/${locale}/properties?error=delete-failed`);
  }

  redirect(`/${locale}/properties`);
}

/* ── Excel Group Import ── */

const UNIT_COLUMN_ALIASES: Record<string, string[]> = {
  customer_name: ["customer name", "name", "client name", "customer", "client", "اسم العميل", "العميل", "الاسم", "full name", "owner name"],
  phone: ["phone", "mobile", "phone number", "رقم الهاتف", "تليفون", "موبايل", "هاتف", "جوال", "cell", "owner phone", "رقم الموبايل", "رقم الجوال"],
  compound_name: ["compound", "location", "compound name", "الكمبوند", "الموقع", "المشروع", "project", "location name"],
  area: ["area", "area sqm", "sqm", "unit area", "المساحة", "مساحة", "space"],
  building_number: ["building number", "building no", "building", "block", "رقم العمارة", "المبنى", "bldg", "bldg number"],
  finishing_status: ["finishing status", "finishing", "finish", "حالة التشطيب", "التشطيب", "تشطيب", "finish status"],
  rent_sale: ["rent sale", "rent/sale", "rent or sale", "deal type", "sale rent", "إيجار بيع", "نوع الصفقة", "بيع ايجار", "نوع العقد"],
  unit_type: ["unit type", "apartment type", "property type", "نوع الوحدة", "نوع الشقة", "نوع العقار", "type"],
  cash_required: ["cash", "cash required", "required cash", "down payment", "المطلوب", "كاش", "مطلوب", "المقدم", "cash amount"],
  remaining: ["remaining", "remainder", "remaining amount", "installment", "المتبقي", "متبقي", "الأقساط", "تقسيط"],
  last_contact_date: ["last contact", "contact date", "date", "last contacted", "تاريخ التواصل", "تاريخ", "contact", "follow up date"],
  additional_notes: ["notes", "additional notes", "extra notes", "ملاحظات", "ملاحظات إضافية", "تعليقات", "comments", "note"],
  feedback: ["feedback", "فيد باك", "تقييم", "رد", "review", "client feedback"],
};

const UNIT_FIXED_COLUMNS = [
  "customer_name", "phone", "compound_name", "area", "building_number",
  "finishing_status", "rent_sale", "unit_type", "cash_required", "remaining",
  "last_contact_date", "additional_notes", "feedback",
];

const PHONE_KW = ["phone", "mobile", "tel", "telephone", "هاتف", "تليفون", "موبايل", "جوال", "cell", "موبيل"];

function mapUnitExcelColumn(excelCol: string): string {
  const cleaned = excelCol.trim().toLowerCase().replace(/[_-]/g, " ");

  for (const [fixed, aliases] of Object.entries(UNIT_COLUMN_ALIASES)) {
    if (aliases.includes(cleaned)) return fixed;
  }

  const isPhone = PHONE_KW.some((kw) => cleaned.includes(kw));
  if (isPhone) {
    if (cleaned.includes("alt") || cleaned.includes("2") || cleaned.includes("بديل") || cleaned.includes("اخر") || cleaned.includes("ثاني")) {
      return "";
    }
    return "phone";
  }

  if (cleaned.includes("cash") || cleaned.includes("كاش") || cleaned.includes("مقدم") || cleaned.includes("مطلوب")) return "cash_required";
  if (cleaned.includes("remaining") || cleaned.includes("متبقي") || cleaned.includes("تقسيط") || cleaned.includes("أقساط")) return "remaining";

  for (const [fixed, aliases] of Object.entries(UNIT_COLUMN_ALIASES)) {
    if (aliases.some((a) => cleaned.includes(a) || a.includes(cleaned))) return fixed;
  }

  return "";
}

function normalizePhone(phone: unknown): string {
  const str = String(phone ?? "");
  if (!str) return "";
  const digits = str.replace(/\D/g, "");
  if (digits.length === 0) return "";

  const prefixes = ["10", "11", "12", "15"];

  if (digits.length === 10 && prefixes.some((p) => digits.startsWith(p))) return "0" + digits;
  if (digits.length === 11 && digits.startsWith("0") && prefixes.some((p) => digits.slice(1).startsWith(p))) return digits;
  if (digits.length === 12 && digits.startsWith("20") && prefixes.some((p) => digits.slice(2).startsWith(p))) return "0" + digits.slice(2);
  if (digits.length === 14 && digits.startsWith("0020") && prefixes.some((p) => digits.slice(4).startsWith(p))) return "0" + digits.slice(4);
  if (digits.length >= 9 && digits.length <= 10 && prefixes.some((p) => digits.startsWith(p))) return "0" + digits;

  return str;
}

function toUnitStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  return String(v);
}

function extractNumber(text: string): string {
  if (!text || !text.trim()) return "";
  const arabicDigits: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  let normalized = text;
  for (const [ar, en] of Object.entries(arabicDigits)) {
    normalized = normalized.split(ar).join(en);
  }
  const match = normalized.match(/[\d.,]+/);
  if (!match) return text;
  let num = match[0].replace(/,/g, "");
  return num || text;
}

const NUMERIC_FIELDS = ["area", "cash_required", "remaining"];

export async function processUnitsExcel(fileBase64: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const base64Data = fileBase64.split(",")[1] || fileBase64;
  const buffer = Buffer.from(base64Data, "base64");
  const workbook = XLSX.read(buffer, { type: "buffer" });

  let allRows: Array<Record<string, string> & { _sheet?: string }> = [];
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const sheetRows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });
    if (sheetRows.length > 0) {
      allRows = allRows.concat(sheetRows.map(r => ({ ...r, _sheet: sheetName })));
    }
  }

  if (allRows.length === 0) throw new Error("excel-empty");

  let headers = Object.keys(allRows[0]).filter(k => k !== "_sheet");
  const nonEmptyColumns = headers.filter((col) =>
    allRows.some((row) => (row[col] ?? "").toString().trim() !== "")
  );
  headers = nonEmptyColumns;

  const columnMap = new Map<string, string>();
  const columns: Array<{ key: string; label: string; type: string }> = [];
  for (const key of headers) {
    const fixed = mapUnitExcelColumn(key);
    const colKey = fixed && UNIT_FIXED_COLUMNS.includes(fixed) ? fixed : key;
    if (!columnMap.has(colKey)) {
      columnMap.set(colKey, key);
      columns.push({
        key: colKey,
        label: key.replace(/[_-]/g, " ").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        type: "text",
      });
    }
  }

  let cleanRows = allRows.map((row) => {
    const record: Record<string, string> & { _sheet?: string } = { _sheet: row._sheet } as any;
    for (const col of headers) record[col] = row[col] ?? "";
    return record;
  });

  cleanRows = cleanRows.filter((row) =>
    headers.some((col) => (row[col] ?? "").toString().trim() !== "")
  );

  const rows = cleanRows.map((row) => {
    const mapped: Record<string, string> = {};
    const extra: Record<string, unknown> = {};
    for (const excelCol of headers) {
      const val = toUnitStr(row[excelCol]);
      const fixed = mapUnitExcelColumn(excelCol);
      if (fixed && UNIT_FIXED_COLUMNS.includes(fixed)) {
        if (val) mapped[fixed] = val;
        else if (!(fixed in mapped)) mapped[fixed] = "";
      } else {
        extra[excelCol] = val;
      }
    }
    for (const col of UNIT_FIXED_COLUMNS) {
      if (!(col in mapped)) mapped[col] = "";
    }

    if (!mapped.compound_name && row._sheet) {
      mapped.compound_name = row._sheet;
    }

    for (const field of NUMERIC_FIELDS) {
      if (mapped[field]) {
        mapped[field] = extractNumber(mapped[field]);
      }
    }

    const phone = mapped.phone || "";
    return {
      mapped,
      extra_data: extra,
      phone_normalized: normalizePhone(phone),
      phone_alt_normalized: "",
      ai_notes: "",
    };
  });

  const warningsCount = rows.filter((row) => {
    const orig = row.mapped.phone || "";
    return orig && row.phone_normalized !== orig;
  }).length;

  return {
    totalRows: rows.length,
    warningsCount,
    columns,
    headers,
    rows,
  };
}

export async function confirmGroupUnits(rows: Array<{ mapped: Record<string, string> }>) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  if (!rows || rows.length === 0) throw new Error("no-rows-to-confirm");

  const insertData: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length; i++) {
    const raw: Record<string, unknown> = {};
    for (const key of Object.keys(unitSchema.shape)) {
      if (key === "custom_fields") continue;
      const val = rows[i].mapped[key];
      if (val !== null && val !== undefined && val !== "") {
        raw[key] = val;
      }
    }
    raw.custom_fields = {};

    const parsed = unitSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; ");
      throw new Error(`Row ${i + 1} invalid → ${issues}. Data: ${JSON.stringify({ ...raw, custom_fields: "{}" })}`);
    }

    insertData.push({
      ...parsed.data,
      created_by: user.id,
    });
  }

  const { error } = await supabase.from("units").insert(insertData);

  if (error) throw new Error(`DB error: ${error.message} (code: ${error.code}, details: ${error.details}, hint: ${error.hint || "none"})`);

  return { success: true, count: insertData.length };
}
