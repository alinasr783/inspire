"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ClientRow = {
  id: string;
  customer_name: string;
  phone: string;
  phone_alt: string | null;
  budget_from: number | null;
  budget_to: number | null;
  payment_method: string | null;
  preferred_area: string | null;
  unit_type: string | null;
  bedrooms: string | null;
  preferred_developer: string | null;
  source: string | null;
  additional_notes: string | null;
  last_contact_date: string | null;
  assigned_employee: string | null;
  custom_fields: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const clientSchema = z.object({
  customer_name: z.string().trim().min(1, "customer-name-required"),
  phone: z.string().trim().min(1, "phone-required"),
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
  custom_fields: z.record(z.string(), z.any()).optional().default({}),
});

export async function addClient(formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const key of Object.keys(clientSchema.shape)) {
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

  const parsed = clientSchema.safeParse({ ...raw, custom_fields: customFields });
  if (!parsed.success) {
    redirect(`/${locale}/clients/new?error=validation`);
  }

  const { error } = await supabase.from("clients").insert({
    ...parsed.data,
    created_by: user.id,
  });

  if (error) {
    redirect(`/${locale}/clients/new?error=create-failed`);
  }

  redirect(`/${locale}/clients`);
}

export async function updateClient(id: string, formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const key of Object.keys(clientSchema.shape)) {
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

  const parsed = clientSchema.safeParse({ ...raw, custom_fields: customFields });
  if (!parsed.success) {
    redirect(`/${locale}/clients/${id}?error=validation`);
  }

  const { data: existing } = await admin
    .from("clients")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    redirect(`/${locale}/clients?error=not-found`);
  }

  if (existing.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      redirect(`/${locale}/clients/${id}?error=unauthorized`);
    }
  }

  const { error } = await admin
    .from("clients")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/${locale}/clients/${id}?error=update-failed`);
  }

  redirect(`/${locale}/clients/${id}`);
}

export async function deleteClient(id: string) {
  const locale = await getLocale();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const { data: existing } = await admin
    .from("clients")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    redirect(`/${locale}/clients?error=not-found`);
  }

  if (existing.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      redirect(`/${locale}/clients?error=unauthorized`);
    }
  }

  const { error } = await admin.from("clients").delete().eq("id", id);

  if (error) {
    redirect(`/${locale}/clients?error=delete-failed`);
  }

  redirect(`/${locale}/clients`);
}

export async function updateClientField(clientId: string, field: string, value: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const allowedFields = [
    "customer_name", "phone", "phone_alt", "budget_from", "budget_to",
    "payment_method", "preferred_area", "unit_type", "bedrooms",
    "preferred_developer", "source", "additional_notes", "last_contact_date",
    "assigned_employee",
  ];

  const admin = createAdminClient();

  if (!allowedFields.includes(field)) {
    const { data: current } = await admin.from("clients").select("custom_fields").eq("id", clientId).single();
    const customFields = (current?.custom_fields ?? {}) as Record<string, unknown>;
    customFields[field] = value.trim() || null;
    const { error } = await admin
      .from("clients")
      .update({ custom_fields: customFields, updated_at: new Date().toISOString() })
      .eq("id", clientId);
    if (error) throw new Error("update-failed");
    return { success: true };
  }

  const numericFields = ["budget_from", "budget_to"];
  let updateValue: unknown = value;
  if (numericFields.includes(field)) {
    const trimmed = value.trim();
    updateValue = trimmed ? Number(trimmed) : null;
    if (trimmed && isNaN(updateValue as number)) updateValue = value;
  } else if (field === "last_contact_date") {
    updateValue = value.trim() || null;
  }

  const { error } = await admin
    .from("clients")
    .update({ [field]: updateValue, updated_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) throw new Error("update-failed");
  return { success: true };
}

/* ── Excel Group Import ── */

import * as XLSX from "xlsx";

const CLIENT_COLUMN_ALIASES: Record<string, string[]> = {
  customer_name: ["customer name","name","client name","customer","client","اسم العميل","العميل","الاسم"],
  phone: ["phone","mobile","phone number","رقم الهاتف","تليفون","موبايل","هاتف","جوال"],
  phone_alt: ["phone alt","phone 2","alternate phone","alt phone","رقم هاتف آخر","هاتف بديل","رقم آخر"],
  budget_from: ["budget from","budget","min budget","ميزانية","الميزانية من"],
  budget_to: ["budget to","max budget","الميزانية إلى"],
  payment_method: ["payment method","payment","cash installment","طريقة الدفع","كاش تقسيط","دفع"],
  preferred_area: ["preferred area","area","المنطقة المفضلة","منطقة","المنطقة"],
  unit_type: ["unit type","apartment type","property type","نوع الوحدة","نوع الشقة"],
  bedrooms: ["bedrooms","beds","غرف النوم","غرف","bedroom"],
  preferred_developer: ["preferred developer","developer","المطور المفضل","مطور","المطور"],
  source: ["source","مصدر","المصدر","جلب"],
  additional_notes: ["notes","additional notes","extra notes","ملاحظات","ملاحظات إضافية"],
  last_contact_date: ["last contact","contact date","date","تاريخ التواصل","تاريخ","last contacted"],
  assigned_employee: ["assigned employee","employee","assigned","موظف مسؤول","الموظف المسؤول","مسؤول"],
};

function mapClientExcelColumn(excelCol: string): string {
  const cleaned = excelCol.trim().replace(/[\s_-]+/g, " ").toLowerCase();

  if (CLIENT_FIXED_COLUMNS.some((c) => c.toLowerCase() === cleaned)) {
    return CLIENT_FIXED_COLUMNS.find((c) => c.toLowerCase() === cleaned)!;
  }

  for (const [fixed, aliases] of Object.entries(CLIENT_COLUMN_ALIASES)) {
    if (aliases.some((a) => a.replace(/[\s_-]+/g, " ").toLowerCase() === cleaned)) return fixed;
  }

  for (const [fixed, aliases] of Object.entries(CLIENT_COLUMN_ALIASES)) {
    if (aliases.some((a) => {
      const norm = a.replace(/[\s_-]+/g, " ").toLowerCase();
      return cleaned.includes(norm) || norm.includes(cleaned);
    })) return fixed;
  }

  return "";
}

const CLIENT_FIXED_COLUMNS = [
  "customer_name","phone","phone_alt","budget_from","budget_to",
  "payment_method","preferred_area","unit_type","bedrooms",
  "preferred_developer","source","additional_notes","last_contact_date",
  "assigned_employee",
];

export async function processClientsExcel(fileBase64: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const base64Data = fileBase64.split(",")[1] || fileBase64;
  const buffer = Buffer.from(base64Data, "base64");
  const workbook = XLSX.read(buffer, { type: "buffer" });

  let allRows: Array<Record<string, string>> = [];
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
    if (rows.length > 0) allRows = allRows.concat(rows);
  }
  if (allRows.length === 0) throw new Error("excel-empty");

  let headers = Object.keys(allRows[0]);
  const nonEmpty = headers.filter((col) => allRows.some((row) => (row[col] ?? "").toString().trim() !== ""));
  headers = nonEmpty;

  const columnMap = new Map<string, string>();
  const columns: Array<{ key: string; label: string; type: string }> = [];
  for (const key of headers) {
    const fixed = mapClientExcelColumn(key);
    const colKey = fixed && CLIENT_FIXED_COLUMNS.includes(fixed) ? fixed : key;
    if (!columnMap.has(colKey)) {
      columnMap.set(colKey, key);
      columns.push({ key: colKey, label: key, type: "text" });
    }
  }

  const cleanRows = allRows.filter((row) => headers.some((col) => (row[col] ?? "").toString().trim() !== ""));

  const rows = cleanRows.map((row) => {
    const mapped: Record<string, string> = {};
    const extra: Record<string, unknown> = {};
    for (const excelCol of headers) {
      const val = String(row[excelCol] ?? "");
      const fixed = mapClientExcelColumn(excelCol);
      if (fixed && CLIENT_FIXED_COLUMNS.includes(fixed)) mapped[fixed] = val;
      else extra[excelCol] = val;
    }
    return { mapped, extra_data: extra, phone_normalized: "", phone_alt_normalized: "", ai_notes: "" };
  });

  return { totalRows: rows.length, warningsCount: 0, columns, headers, rows };
}

export async function confirmGroupClients(rows: Array<{ mapped: Record<string, string> }>) {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  if (!rows || rows.length === 0) throw new Error("no-rows");

  const admin = createAdminClient();
  const validRows: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const r of rows) {
    const name = (r.mapped.customer_name || "").trim();
    const phone = (r.mapped.phone || "").trim();
    if (!name || !phone) { skipped++; continue; }

    let lastContact: string | null = (r.mapped.last_contact_date || "").trim();
    if (lastContact) {
      const num = Number(lastContact);
      if (!isNaN(num) && num > 30000 && num < 100000) {
        const jsDate = new Date((num - 25569) * 86400000);
        if (!isNaN(jsDate.getTime())) {
          lastContact = jsDate.toISOString().slice(0, 10);
        }
      }
    }

    let bf = r.mapped.budget_from?.trim();
    let bt = r.mapped.budget_to?.trim();
    if (bf && !isNaN(Number(bf)) && Number(bf) > 30000 && Number(bf) < 100000) bf = "";
    if (bt && !isNaN(Number(bt)) && Number(bt) > 30000 && Number(bt) < 100000) bt = "";

    validRows.push({
      customer_name: name,
      phone,
      phone_alt: r.mapped.phone_alt?.trim() || null,
      budget_from: bf ? Number(bf) : null,
      budget_to: bt ? Number(bt) : null,
      payment_method: r.mapped.payment_method?.trim() || null,
      preferred_area: r.mapped.preferred_area?.trim() || null,
      unit_type: r.mapped.unit_type?.trim() || null,
      bedrooms: r.mapped.bedrooms?.trim() || null,
      preferred_developer: r.mapped.preferred_developer?.trim() || null,
      source: r.mapped.source?.trim() || null,
      additional_notes: r.mapped.additional_notes?.trim() || null,
      last_contact_date: lastContact || null,
      assigned_employee: r.mapped.assigned_employee?.trim() || null,
      custom_fields: {},
      created_by: user.id,
    });
  }

  if (validRows.length === 0) throw new Error(`All ${rows.length} rows have empty name or phone. Skipped ${skipped}`);
  const { error } = await admin.from("clients").insert(validRows);
  if (error) throw new Error(`DB error: ${error.message}`);
  return { success: true, inserted: validRows.length, skipped };
}
