"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UNCONFIRMED_PAGE_SIZE } from "@/lib/unconfirmed-constants";
import {
  mapExcelColumn,
  FIXED_COLUMNS,
  isBlankHeader,
  extraDataColumnLabel,
  buildPreviewRows,
  hydrateRecordFromExtraData,
} from "@/lib/excel-parse";

export interface UnconfirmedRecord {
  [key: string]: unknown;
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
  assigned_employee: string | null;
  backup_employee: string | null;
  backup_feedback: string;
  updated_by: string | null;
}

export interface PreviewRow {
  mapped: Record<string, string>;
  extra_data: Record<string, unknown>;
  phone_normalized: string;
  phone_alt_normalized: string;
  ai_notes: string;
  /** اسم ملف المصدر — للعرض في المعاينة فقط، لا يُحفظ في قاعدة البيانات */
  sourceFile?: string;
}

export interface PreviewResult {
  totalRows: number;
  warningsCount: number;
  columns: Array<{ key: string; label: string; type: string }>;
  rows: PreviewRow[];
  headers: string[];
  sourceFile?: string;
  /** تشخيص إضافي لعرض أسباب واضحة في الواجهة */
  diagnostics?: {
    sheetsCount: number;
    sheetsUsed: string[];
    unmappedHeaders: string[];
    mappedKeys: string[];
    missingCritical: string[];
    emptyRowsSkipped: number;
  };
}

const PHONE_FALLBACK_SLOTS = ["owner_phone", "owner_phone_alt"];

export async function processExcelFile(fileBase64: string, fileName: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const base64Data = fileBase64.split(",")[1] || fileBase64;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, "base64");
    if (buffer.length === 0) throw new Error("empty-buffer");
  } catch {
    throw new Error("invalid-base64");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new Error("corrupt-file");
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("no-sheets");
  }

  let allRows: Record<string, string>[] = [];
  const sheetsUsed: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    let sheetRows: Record<string, string>[] = [];
    try {
      sheetRows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });
    } catch {
      throw new Error(`unreadable-sheet:${sheetName}`);
    }
    if (sheetRows.length > 0) {
      allRows = allRows.concat(sheetRows);
      sheetsUsed.push(sheetName);
    }
  }

  if (allRows.length === 0) {
    throw new Error("excel-empty");
  }

  const rawHeaders = Object.keys(allRows[0] ?? {});
  const isNonEmpty = (col: string) =>
    allRows.some((row) => (row[col] ?? "").toString().trim() !== "");

  const namedPhoneClaimed = new Set<string>();
  for (const key of rawHeaders) {
    if (isBlankHeader(key) || !isNonEmpty(key)) continue;
    const fixed = mapExcelColumn(key);
    if (fixed === "owner_phone" || fixed === "owner_phone_alt") {
      namedPhoneClaimed.add(fixed);
    }
  }
  const freeBlankSlots = PHONE_FALLBACK_SLOTS.filter((s) => !namedPhoneClaimed.has(s)).length;

  let blanksSeen = 0;
  const headers = rawHeaders.filter((col) => {
    if (isBlankHeader(col)) {
      blanksSeen++;
      if (blanksSeen <= freeBlankSlots) return true;
    }
    return isNonEmpty(col);
  });

  if (headers.length === 0) {
    throw new Error("no-headers");
  }

  const fixedByHeader = new Map<string, string>();
  const claimedFixed = new Set<string>();
  for (const key of headers) {
    if (isBlankHeader(key)) continue;
    const fixed = mapExcelColumn(key);
    if (fixed && FIXED_COLUMNS.includes(fixed)) {
      fixedByHeader.set(key, fixed);
      claimedFixed.add(fixed);
    }
  }
  for (const key of headers) {
    if (!isBlankHeader(key)) continue;
    const slot = PHONE_FALLBACK_SLOTS.find((s) => !claimedFixed.has(s));
    if (slot) {
      fixedByHeader.set(key, slot);
      claimedFixed.add(slot);
    }
  }
  const fixedOf = (h: string) => fixedByHeader.get(h) ?? "";

  const columnMap = new Map<string, string>();
  const columns: Array<{ key: string; label: string; type: "text" }> = [];
  let blankOverflowSeen = 0;
  for (const key of headers) {
    const fixed = fixedOf(key);
    const colKey = fixed && FIXED_COLUMNS.includes(fixed) ? fixed : key;
    if (!columnMap.has(colKey)) {
      columnMap.set(colKey, key);
      let blankPhoneLabel: string | null = null;
      if (isBlankHeader(key)) {
        if (fixed === "owner_phone_alt") blankPhoneLabel = "رقم هاتف بديل";
        else if (fixed === "owner_phone") blankPhoneLabel = "رقم الهاتف";
        else {
          blankPhoneLabel = extraDataColumnLabel(key, blankOverflowSeen);
          blankOverflowSeen++;
        }
      }
      columns.push({
        key: colKey,
        label: blankPhoneLabel ?? key.replace(/[_-]/g, " ").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
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

  const rowsBeforeFilter = cleanRows.length;
  cleanRows = cleanRows.filter((row) =>
    headers.some((col) => (row[col] ?? "").toString().trim() !== "")
  );
  const emptyRowsSkipped = rowsBeforeFilter - cleanRows.length;

  if (cleanRows.length === 0) {
    throw new Error("only-empty-rows");
  }

  const previewRows = buildPreviewRows(cleanRows, headers, fixedOf);

  const warningsCount = previewRows.filter((row) => {
    const orig = row.mapped.owner_phone || "";
    return orig && row.phone_normalized !== orig;
  }).length;

  // تشخيص الأعمدة: أي عمود لم يُطابق أي حقل معروف + الحقول الحرجة الناقصة
  const unmappedHeaders = headers.filter((h) => {
    const fixed = fixedOf(h);
    return !fixed || !FIXED_COLUMNS.includes(fixed);
  });
  const mappedKeys = Array.from(
    new Set(
      headers
        .map((h) => fixedOf(h))
        .filter((k) => k && FIXED_COLUMNS.includes(k))
    )
  );
  const missingCritical: string[] = [];
  if (!mappedKeys.includes("owner_phone")) missingCritical.push("owner_phone");
  if (!mappedKeys.includes("owner_name")) missingCritical.push("owner_name");

  return {
    totalRows: previewRows.length,
    warningsCount,
    columns,
    headers,
    rows: previewRows,
    diagnostics: {
      sheetsCount: workbook.SheetNames.length,
      sheetsUsed,
      unmappedHeaders,
      mappedKeys,
      missingCritical,
      emptyRowsSkipped,
    },
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
    data.rows.map((row, index) => {
      const candidate = {
        ...row.mapped,
        extra_data: row.extra_data ?? {},
        phone_normalized: row.phone_normalized ?? "",
        phone_alt_normalized: row.phone_alt_normalized ?? "",
      } as unknown as UnconfirmedRecord;
      const { record: hydrated } = hydrateRecordFromExtraData(candidate);
      const mappedFields: Record<string, string> = {};
      for (const col of FIXED_COLUMNS) {
        mappedFields[col] = String((hydrated as Record<string, unknown>)[col] ?? row.mapped?.[col] ?? "");
      }
      return {
        upload_id: upload.id,
        row_number: index + 1,
        ...mappedFields,
        extra_data: row.extra_data,
        phone_normalized: hydrated.phone_normalized || row.phone_normalized || "",
        phone_alt_normalized: hydrated.phone_alt_normalized || row.phone_alt_normalized || "",
        ai_notes: row.ai_notes,
        status: "approved",
        file_id: data.fileId || null,
      };
    })
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
    "assigned_employee", "backup_employee", "backup_feedback",
  ];
  if (!allowedFields.includes(field)) throw new Error("invalid-field");

  const updateValue = (field === "assigned_employee" || field === "backup_employee") && value === "" ? null : value;

  const updates: Record<string, unknown> = { [field]: updateValue, updated_by: user.id };

  const shouldAutoAssign =
    (field === "whatsapp_state" && value !== "") ||
    (field === "last_feedback" && value.trim() !== "");

  if (shouldAutoAssign) {
    updates.assigned_employee = user.id;
  }

  const shouldAutoAssignBackup =
    field === "backup_feedback" && value.trim() !== "";

  if (shouldAutoAssignBackup) {
    updates.backup_employee = user.id;
  }

  const { error } = await admin
    .from("unconfirmed_records")
    .update(updates)
    .eq("id", recordId);

  if (error) {
    console.error("updateRecordField error:", error);
    throw new Error(`update-failed: ${error.code} - ${error.message} - hint: ${error.hint || "none"}`);
  }
}

export async function quickCreateRecord(): Promise<UnconfirmedRecord> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("unconfirmed_records").insert({
    owner_name: "New Record",
    owner_phone: "",
    unit_area: "",
    building_number: "",
    unit_number: "",
  }).select("*").single();
  if (error) throw new Error(`create-failed: ${error.message}`);
  return data as UnconfirmedRecord;
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
  const { record: hydrated, dbUpdates } = hydrateRecordFromExtraData(record as UnconfirmedRecord);
  if (Object.keys(dbUpdates).length > 0) {
    await admin.from("unconfirmed_records").update(dbUpdates).eq("id", recordId);
  }
  return hydrated;
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
  // جلب كل الرفعات عبر pagination حتى لا يُقطع عند حد PostgREST الافتراضي (1000 صف)
  const PAGE_SIZE = 1000;
  const MAX_PAGES = 100;
  const allUploads: Record<string, unknown>[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data: uploads, error } = await admin
      .from("unconfirmed_uploads")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw new Error("fetch-failed");
    if (!uploads || uploads.length === 0) break;
    allUploads.push(...(uploads as Record<string, unknown>[]));
    if (uploads.length < PAGE_SIZE) break;
  }
  const uploads = allUploads as unknown as { created_by: string }[];

  const userIds = Array.from(new Set((uploads ?? []).map((u) => u.created_by)));
  let profiles: { id: string; full_name: string }[] | null = [];
  if (userIds.length > 0) {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    profiles = data as { id: string; full_name: string }[] | null;
  }

  const creatorMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.id]));

  return (uploads ?? []).map((u) => ({
    ...u,
    creator_name: creatorMap.get(u.created_by) || "Unknown",
  }));
}

export interface GetRecordsOptions {
  uploadId?: string;
  status?: string;
  q?: string;
  folderId?: string;
  fileId?: string;
  limit?: number;
  offset?: number;
  /** فلترة السجلات التي لديها feedback فقط — تُطبق على السيرفر */
  hasFeedback?: boolean;
}

async function resolveFolderFileIds(admin: ReturnType<typeof createAdminClient>, folderId: string): Promise<string[]> {
  // جلب كل ملفات الفولدر عبر pagination (تجنب قطع القائمة عند 1000 ملف)
  const PAGE_FILES = 1000;
  const collected: string[] = [];
  for (let page = 0; page < 100; page++) {
    const { data: files, error: filesError } = await admin
      .from("unconfirmed_files")
      .select("id")
      .eq("folder_id", folderId)
      .range(page * PAGE_FILES, page * PAGE_FILES + PAGE_FILES - 1);
    if (filesError) throw new Error("fetch-failed");
    if (!files || files.length === 0) break;
    collected.push(...(files as { id: string }[]).map((f) => f.id));
    if (files.length < PAGE_FILES) break;
  }
  return collected;
}

function escapeLike(term: string): string {
  return term.replace(/[%_,()]/g, (c) => `\\${c}`).replace(/,/g, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyRecordFilters(query: any, options: GetRecordsOptions | undefined, fileIds: string[] | undefined, includeBackupFeedback = true): any {
  if (options?.uploadId) query = query.eq("upload_id", options.uploadId);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.fileId) query = query.eq("file_id", options.fileId);
  if (fileIds) query = query.in("file_id", fileIds);
  if (options?.hasFeedback) {
    // يشمل السجلات التي بها آخر فيدباك أو فيد باك الموظف الاحتياطي (غير فارغ)
    if (includeBackupFeedback) {
      query = query.or("last_feedback.ilike._%,backup_feedback.ilike._%");
    } else {
      query = query.neq("last_feedback", "").not("last_feedback", "is", null);
    }
  }
  const q = options?.q?.trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    // بحث نصي على السيرفر حتى يعمل مع كل الـ 18000+ صف وليس فقط المحمّل منها
    const clauses = [
      `owner_name.ilike.${like}`,
      `owner_phone.ilike.${like}`,
      `owner_phone_alt.ilike.${like}`,
      `building_number.ilike.${like}`,
      `unit_number.ilike.${like}`,
      `unit_area.ilike.${like}`,
      `affiliated_company.ilike.${like}`,
      `last_feedback.ilike.${like}`,
      ...(includeBackupFeedback ? [`backup_feedback.ilike.${like}`] : []),
      `phone_normalized.ilike.${like}`,
      `phone_alt_normalized.ilike.${like}`,
    ];
    query = query.or(clauses.join(","));
  }
  return query;
}

export async function getRecords(options?: GetRecordsOptions) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  let fileIds: string[] | undefined;
  if (options?.folderId) {
    fileIds = await resolveFolderFileIds(admin, options.folderId);
    if (fileIds.length === 0) return [];
  }

  const limit = options?.limit ?? UNCONFIRMED_PAGE_SIZE;
  const offset = options?.offset ?? 0;

  // جلب النطاق المطلوب [offset, offset+limit) على دفعات (PostgREST يقطع عند ~1000 صف لكل طلب)
  // بترتيب ثابت حتى يكون الـ offset مستقراً عبر الصفحات.
  const FETCH_CHUNK = 1000;
  const allRecords: UnconfirmedRecord[] = [];
  let cursor = offset;
  const end = offset + limit;
  let useBackupFeedback = true;

  while (cursor < end) {
    const chunkEnd = Math.min(cursor + FETCH_CHUNK - 1, end - 1);
    let query = admin.from("unconfirmed_records").select("*");
    query = applyRecordFilters(query, options, fileIds, useBackupFeedback);
    let { data: records, error } = await query
      .order("created_at", { ascending: true })
      .order("row_number", { ascending: true })
      .order("id", { ascending: true })
      .range(cursor, chunkEnd);

    if (error && useBackupFeedback && (options?.hasFeedback || options?.q)) {
      useBackupFeedback = false;
      let fallbackQuery = admin.from("unconfirmed_records").select("*");
      fallbackQuery = applyRecordFilters(fallbackQuery, options, fileIds, false);
      const retry = await fallbackQuery
        .order("created_at", { ascending: true })
        .order("row_number", { ascending: true })
        .order("id", { ascending: true })
        .range(cursor, chunkEnd);
      records = retry.data;
      error = retry.error;
    }

    if (error) throw new Error("fetch-failed");
    const batch = (records ?? []) as UnconfirmedRecord[];
    allRecords.push(...batch);
    if (batch.length < chunkEnd - cursor + 1) break; // نفدت البيانات
    cursor = chunkEnd + 1;
  }

  const pendingRepairs: Array<{ id: string; updates: Record<string, unknown> }> = [];
  const hydratedRecords = allRecords.map((raw) => {
    const { record, dbUpdates } = hydrateRecordFromExtraData(raw);
    if (raw.id && Object.keys(dbUpdates).length > 0) {
      pendingRepairs.push({ id: raw.id, updates: dbUpdates });
    }
    return record;
  });

  if (pendingRepairs.length > 0) {
    await Promise.allSettled(
      pendingRepairs.map(({ id, updates }) =>
        admin.from("unconfirmed_records").update(updates).eq("id", id)
      )
    );
  }

  return hydratedRecords;
}

/** العدد الإجمالي للسجلات المطابقة للفلاتر — يُستخدم لعرض "عرض X من Y" الصحيح */
export async function getUnconfirmedRecordsCount(options?: Omit<GetRecordsOptions, "limit" | "offset">): Promise<number> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  let fileIds: string[] | undefined;
  if (options?.folderId) {
    fileIds = await resolveFolderFileIds(admin, options.folderId);
    if (fileIds.length === 0) return 0;
  }

  let query = admin.from("unconfirmed_records").select("id", { count: "exact", head: true });
  query = applyRecordFilters(query, options, fileIds, true);
  let { count, error } = await query;

  if (error && (options?.hasFeedback || options?.q)) {
    let fallbackQuery = admin.from("unconfirmed_records").select("id", { count: "exact", head: true });
    fallbackQuery = applyRecordFilters(fallbackQuery, options, fileIds, false);
    const retry = await fallbackQuery;
    count = retry.count;
    error = retry.error;
  }

  if (error) throw new Error("fetch-failed");
  return count ?? 0;
}

/**
 * استرجاع البيانات المخزنة داخل extra_data وكتابتها في الأعمدة القياسية بقاعدة البيانات
 * لجميع السجلات (أو لملف/فولدر محدد) التي تكون أعمدتها القياسية فارغة.
 */
export async function repairUnconfirmedRecordsFromExtraData(options?: {
  fileId?: string;
  folderId?: string;
  uploadId?: string;
}): Promise<{ scanned: number; repaired: number }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  let fileIds: string[] | undefined;
  if (options?.folderId) {
    fileIds = await resolveFolderFileIds(admin, options.folderId);
    if (fileIds.length === 0) return { scanned: 0, repaired: 0 };
  }

  const BATCH_SIZE = 500;
  const UPDATE_CONCURRENCY = 25;
  let scanned = 0;
  let repaired = 0;

  for (let page = 0; page < 40; page++) {
    let query = admin.from("unconfirmed_records").select("*");
    if (options?.fileId) query = query.eq("file_id", options.fileId);
    if (options?.uploadId) query = query.eq("upload_id", options.uploadId);
    if (fileIds) query = query.in("file_id", fileIds);
    if (!options?.fileId && !options?.folderId && !options?.uploadId) {
      // عند الفحص العام نستهدف الصفوف التي يكون فيها اسم المالك أو الهاتف فارغاً لتسريع الإصلاح
      query = query.or("owner_name.eq.,owner_phone.eq.");
    }

    const { data: rows, error } = await query
      .order("created_at", { ascending: true })
      .order("row_number", { ascending: true })
      .order("id", { ascending: true })
      .range(page * BATCH_SIZE, page * BATCH_SIZE + BATCH_SIZE - 1);

    if (error || !rows || rows.length === 0) break;

    scanned += rows.length;
    const toUpdate: Array<{ id: string; updates: Record<string, unknown> }> = [];
    for (const raw of rows as UnconfirmedRecord[]) {
      const { dbUpdates } = hydrateRecordFromExtraData(raw);
      if (raw.id && Object.keys(dbUpdates).length > 0) {
        toUpdate.push({ id: raw.id, updates: dbUpdates });
      }
    }

    for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
      const slice = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
      await Promise.allSettled(
        slice.map(({ id, updates }) =>
          admin.from("unconfirmed_records").update(updates).eq("id", id)
        )
      );
      repaired += slice.length;
    }

    if (rows.length < BATCH_SIZE) break;
  }

  return { scanned, repaired };
}
