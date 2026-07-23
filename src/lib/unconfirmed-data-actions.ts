"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UnconfirmedRecord {
  id: string;
  upload_id: string;
  row_number: number;
  status: "pending" | "approved" | "rejected";
  created_at: string | null;
  owner_name: string;
  unit_area: string;
  building_number: string;
  unit_number: string;
  owner_phone: string;
  owner_phone_alt: string;
  affiliated_company: string;
  last_feedback: string;
  last_contact_date: string;
  phone_normalized: string;
  phone_alt_normalized: string;
  ai_notes: string;
  extra_data: Record<string, unknown>;
  whatsapp_state: "" | "send" | "failed";
  file_id: string | null;
  [key: string]: unknown;
}

export interface PreviewRow {
  mapped: Record<string, string>;
  extra_data: Record<string, unknown>;
  phone_normalized: string;
  phone_alt_normalized: string;
  ai_notes: string;
}

export interface PreviewResult {
  totalRows: number;
  warningsCount: number;
  columns: Array<{ key: string; label: string; type: string }>;
  rows: PreviewRow[];
  headers: string[];
}

const COLUMN_ALIASES: Record<string, string[]> = {
  owner_name: ["owner name", "owner", "customer name", "customer", "client name", "client", "المالك", "اسم المالك", "العميل", "اسم العميل", "name", "full name", "الاسم", "owner"],
  unit_area: ["unit area", "area", "area sqm", "property area", "المساحة", "مساحة الوحدة", "area (sqm)", "sqm", "size"],
  building_number: ["building number", "building no", "building", "block", "رقم المبنى", "رقم المبني", "رقم العمارة", "رقم العماره", "المبنى", "المبني", "block number", "building #", "bldg"],
  unit_number: ["unit number", "unit no", "unit", "apartment number", "apartment no", "flat no", "رقم الوحدة", "الوحدة", "رقم الشقة", "رقم الشقه", "apartment", "flat", "apt"],
  owner_phone: ["owner phone", "phone", "phone number", "mobile", "mobile number", "tel", "telephone", "هاتف", "رقم الهاتف", "رقم التليفون", "رقم الموبايل", "تليفون", "موبايل", "cell", "cell phone", "mobile no", "phone no", "رقم التواصل", "جوال", "رقم الجوال", "phone 1", "موبيل"],
  owner_phone_alt: ["alt phone", "phone 2", "phone alt", "alternative phone", "secondary phone", "هاتف بديل", "تليفون بديل", "phone2", "other phone", "second phone", "mobile 2", "alt mobile", "رقم بديل", "هاتف اخر", "تليفون اخر"],
  affiliated_company: ["affiliated company", "company", "developer", "شركة", "الشركة التابعة", "المطور", "company name", "شركة المطور"],
  last_contact_date: ["last contact date", "contact date", "date", "last contacted", "تاريخ", "آخر تاريخ تواصل", "تاريخ الاتصال", "contacted", "last call", "اخر تواصل"],
};

const PHONE_KEYWORDS = ["phone", "mobile", "tel", "telephone", "هاتف", "تليفون", "موبايل", "جوال", "cell", "موبيل"];

function mapExcelColumn(excelCol: string): string {
  const cleaned = excelCol.trim().toLowerCase().replace(/[_-]/g, " ");

  for (const [fixed, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(cleaned)) return fixed;
  }

  if (cleaned.includes("رقم")) {
    if (cleaned.includes("مبني") || cleaned.includes("مبنى") || cleaned.includes("عمارة") || cleaned.includes("عماره")) {
      return "building_number";
    }
    if (cleaned.includes("وحدة") || cleaned.includes("شقة") || cleaned.includes("شقه") || cleaned.includes("apartment")) {
      return "unit_number";
    }
  }

  const isPhone = PHONE_KEYWORDS.some((kw) => cleaned.includes(kw));
  if (isPhone) {
    if (cleaned.includes("alt") || cleaned.includes("2") || cleaned.includes("بديل") || cleaned.includes("اخر") || cleaned.includes("ثاني")) {
      return "owner_phone_alt";
    }
    return "owner_phone";
  }

  if (cleaned.includes("رقم")) return "owner_phone";

  for (const [fixed, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some((a) => cleaned.includes(a) || a.includes(cleaned))) return fixed;
  }

  return "";
}

const FIXED_COLUMNS = [
  "owner_name",
  "unit_area",
  "building_number",
  "unit_number",
  "owner_phone",
  "owner_phone_alt",
  "affiliated_company",
  "last_feedback",
  "last_contact_date",
];

function normalizeEgyptianPhone(phone: unknown): string {
  const str = String(phone ?? "");
  if (!str) return "";
  const digits = str.replace(/\D/g, "");
  if (digits.length === 0) return "";

  const prefixes = ["10", "11", "12", "15"];

  if (digits.length === 10 && prefixes.some((p) => digits.startsWith(p))) {
    return "0" + digits;
  }
  if (digits.length === 11 && digits.startsWith("0") && prefixes.some((p) => digits.slice(1).startsWith(p))) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith("20") && prefixes.some((p) => digits.slice(2).startsWith(p))) {
    return "0" + digits.slice(2);
  }
  if (digits.length === 14 && digits.startsWith("0020") && prefixes.some((p) => digits.slice(4).startsWith(p))) {
    return "0" + digits.slice(4);
  }
  if (digits.length >= 9 && digits.length <= 10 && prefixes.some((p) => digits.startsWith(p))) {
    return "0" + digits;
  }
  if (digits.length >= 11 && digits.startsWith("2")) return digits;

  return str;
}

function toStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") {
    return v >= 1e12 ? String(v) : String(v);
  }
  return String(v);
}

function buildPreviewRows(jsonData: Record<string, string>[], headers: string[]): PreviewRow[] {
  return jsonData.map((row) => {
    const mapped: Record<string, string> = {};
    const extraData: Record<string, unknown> = {};
    for (const excelCol of headers) {
      const val = toStr(row[excelCol]);
      const fixed = mapExcelColumn(excelCol);
      if (fixed && FIXED_COLUMNS.includes(fixed)) {
        if (val) {
          mapped[fixed] = val;
        } else if (!(fixed in mapped)) {
          mapped[fixed] = "";
        }
      } else {
        extraData[excelCol] = val;
      }
    }
    for (const col of FIXED_COLUMNS) {
      if (!(col in mapped)) mapped[col] = "";
    }
    mapped["last_feedback"] = "";
    const phone = mapped.owner_phone || "";
    const phoneAlt = mapped.owner_phone_alt || "";
    return {
      mapped,
      extra_data: extraData,
      phone_normalized: normalizeEgyptianPhone(phone),
      phone_alt_normalized: normalizeEgyptianPhone(phoneAlt),
      ai_notes: "",
    };
  });
}

export async function processExcelFile(fileBase64: string, fileName: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const base64Data = fileBase64.split(",")[1] || fileBase64;
  const buffer = Buffer.from(base64Data, "base64");
  const workbook = XLSX.read(buffer, { type: "buffer" });

  let allRows: Record<string, string>[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const sheetRows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });
    if (sheetRows.length > 0) {
      allRows = allRows.concat(sheetRows);
    }
  }

  if (allRows.length === 0) {
    throw new Error("excel-empty");
  }

  let headers = Object.keys(allRows[0]);

  const nonEmptyColumns = headers.filter((col) =>
    allRows.some((row) => (row[col] ?? "").toString().trim() !== "")
  );
  headers = nonEmptyColumns;

  const columnMap = new Map<string, string>();
  const columns: Array<{ key: string; label: string; type: "text" }> = [];
  for (const key of headers) {
    const fixed = mapExcelColumn(key);
    const colKey = fixed && FIXED_COLUMNS.includes(fixed) ? fixed : key;
    if (!columnMap.has(colKey)) {
      columnMap.set(colKey, key);
      columns.push({
        key: colKey,
        label: key.replace(/[_-]/g, " ").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        type: "text" as const,
      });
    }
  }

  let cleanRows = allRows.map((row) => {
    const record: Record<string, string> = {};
    for (const col of headers) {
      record[col] = row[col] ?? "";
    }
    return record;
  });

  cleanRows = cleanRows.filter((row) =>
    headers.some((col) => (row[col] ?? "").toString().trim() !== "")
  );

  const previewRows = buildPreviewRows(cleanRows, headers);

  const warningsCount = previewRows.filter((row) => {
    const orig = row.mapped.owner_phone || "";
    return orig && row.phone_normalized !== orig;
  }).length;

  return {
    totalRows: previewRows.length,
    warningsCount,
    columns,
    headers,
    rows: previewRows,
  } satisfies PreviewResult;
}

export async function confirmUpload(data: {
  fileName: string;
  headers: string[];
  rows: PreviewRow[];
  fileId?: string | null;
}) {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  if (!data.rows || data.rows.length === 0) throw new Error("no-rows-to-confirm");

  const admin = createAdminClient();

  const { data: upload, error: uploadError } = await admin
    .from("unconfirmed_uploads")
    .insert({
      original_filename: data.fileName,
      status: "confirmed",
      total_rows: data.rows.length,
      created_by: user.id,
    })
    .select()
    .single();

  if (uploadError || !upload) {
    throw new Error(`upload-create-failed: ${uploadError?.message || "unknown"}`);
  }

  const { error: recordsError } = await admin.from("unconfirmed_records").insert(
    data.rows.map((row, index) => ({
      upload_id: upload.id,
      row_number: index + 1,
      ...row.mapped,
      extra_data: row.extra_data,
      phone_normalized: row.phone_normalized,
      phone_alt_normalized: row.phone_alt_normalized,
      ai_notes: row.ai_notes,
      status: "approved",
      file_id: data.fileId || null,
    }))
  );

  if (recordsError) {
    await admin.from("unconfirmed_uploads").delete().eq("id", upload.id);
    throw new Error(`records-create-failed: ${recordsError.message}`);
  }

  redirect(`/${locale}/unconfirmed-data`);
}

export async function updateRecordField(recordId: string, field: string, value: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();
  const allowedFields = [
    "owner_name", "unit_area", "building_number", "unit_number",
    "owner_phone", "owner_phone_alt", "affiliated_company",
    "last_feedback", "last_contact_date", "whatsapp_state",
  ];
  if (!allowedFields.includes(field)) throw new Error("invalid-field");

  const { error } = await admin
    .from("unconfirmed_records")
    .update({ [field]: value })
    .eq("id", recordId);

  if (error) throw new Error("update-failed");
}

export async function getRecord(recordId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();
  const { data: record, error } = await admin
    .from("unconfirmed_records")
    .select("*")
    .eq("id", recordId)
    .single();

  if (error || !record) throw new Error("record-not-found");
  return record as UnconfirmedRecord;
}

export async function updateRecordStatus(recordId: string, status: "pending" | "approved" | "rejected") {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();
  const { error } = await admin
    .from("unconfirmed_records")
    .update({ status })
    .eq("id", recordId);

  if (error) throw new Error("update-failed");
}

export async function deleteRecords(recordIds: string[]) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  if (!recordIds || recordIds.length === 0) throw new Error("no-ids-provided");

  const admin = createAdminClient();
  const { error } = await admin
    .from("unconfirmed_records")
    .delete()
    .in("id", recordIds);

  if (error) throw new Error("delete-failed");
}

export async function getUploads() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();
  const { data: uploads, error } = await admin
    .from("unconfirmed_uploads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error("fetch-failed");

  const userIds = Array.from(new Set((uploads ?? []).map((u) => u.created_by)));
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const creatorMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.id]));

  return (uploads ?? []).map((u) => ({
    ...u,
    creator_name: creatorMap.get(u.created_by) || "Unknown",
  }));
}

export async function getRecords(options?: { uploadId?: string; status?: string; q?: string; folderId?: string; fileId?: string }) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  let fileIds: string[] | undefined;
  if (options?.folderId) {
    const { data: files } = await admin
      .from("unconfirmed_files")
      .select("id")
      .eq("folder_id", options.folderId);
    fileIds = (files ?? []).map((f) => f.id);
    if (fileIds.length === 0) return [];
  }

  let query = admin.from("unconfirmed_records").select("*");

  if (options?.uploadId) query = query.eq("upload_id", options.uploadId);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.fileId) query = query.eq("file_id", options.fileId);
  if (fileIds) query = query.in("file_id", fileIds);

  const { data: records, error } = await query.order("row_number", { ascending: true });
  if (error) throw new Error("fetch-failed");

  if (options?.q) {
    const searchTerm = options.q.toLowerCase();
    return (records ?? []).filter((r) => {
      const searchable = [
        r.owner_name,
        r.unit_area,
        r.building_number,
        r.unit_number,
        r.owner_phone,
        r.owner_phone_alt,
        r.affiliated_company,
        r.last_feedback,
        JSON.stringify(r.extra_data || {}),
      ].join(" ").toLowerCase();
      return searchable.includes(searchTerm);
    });
  }

  return records ?? [];
}
