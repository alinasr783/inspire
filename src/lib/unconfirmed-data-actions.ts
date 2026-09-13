"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UNCONFIRMED_UPLOAD_LIMITS } from "@/lib/unconfirmed-upload-limits";
import { parseExcelBuffer } from "@/lib/excel-parse";

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
  updated_by: string | null;
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
  sourceFile?: string;
}

export async function processExcelFile(fileBase64: string, fileName: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const base64Data = fileBase64.split(",")[1] || fileBase64;
  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.length > UNCONFIRMED_UPLOAD_LIMITS.maxBytesPerFile) {
    throw new Error("file-too-large");
  }

  return parseExcelBuffer(new Uint8Array(buffer), fileName);
}

/**
 * Chunked multi-file confirm.
 *
 * Large previews are saved in small batches (see UNCONFIRMED_UPLOAD_LIMITS.confirmChunkSize)
 * so no single Server Action request/response carries a giant nested array.
 * The client orchestrates: createConfirmedUpload -> appendConfirmedRecords x N.
 * On any chunk failure the client calls deleteConfirmedUpload to roll back.
 */
export async function createConfirmedUpload(data: {
  fileName: string;
  totalRows: number;
  fileId?: string | null;
}): Promise<{ uploadId: string }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  if (!data.fileName || !data.totalRows || data.totalRows <= 0) throw new Error("no-rows-to-confirm");

  const admin = createAdminClient();
  const { data: upload, error: uploadError } = await admin
    .from("unconfirmed_uploads")
    .insert({
      original_filename: data.fileName,
      status: "confirmed",
      total_rows: data.totalRows,
      created_by: user.id,
    })
    .select()
    .single();

  if (uploadError || !upload) {
    throw new Error(`upload-create-failed: ${uploadError?.message || "unknown"}`);
  }

  return { uploadId: (upload as { id: string }).id };
}

export async function appendConfirmedRecords(data: {
  uploadId: string;
  rows: PreviewRow[];
  startRow: number;
  fileId?: string | null;
}): Promise<{ inserted: number }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  if (!data.uploadId) throw new Error("no-upload-id");
  if (!data.rows || data.rows.length === 0) return { inserted: 0 };
  if (data.rows.length > UNCONFIRMED_UPLOAD_LIMITS.confirmChunkSize) throw new Error("chunk-too-large");

  const admin = createAdminClient();
  const { error: recordsError } = await admin.from("unconfirmed_records").insert(
    data.rows.map((row, index) => ({
      upload_id: data.uploadId,
      row_number: data.startRow + index + 1,
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
    throw new Error(`records-create-failed: ${recordsError.message}`);
  }

  return { inserted: data.rows.length };
}

export async function deleteConfirmedUpload(uploadId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  if (!uploadId) return;

  const admin = createAdminClient();
  await admin.from("unconfirmed_records").delete().eq("upload_id", uploadId);
  await admin.from("unconfirmed_uploads").delete().eq("id", uploadId);
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
    "assigned_employee",
  ];
  if (!allowedFields.includes(field)) throw new Error("invalid-field");

  const updateValue = field === "assigned_employee" && value === "" ? null : value;

  const updates: Record<string, unknown> = { [field]: updateValue, updated_by: user.id };

  const shouldAutoAssign =
    (field === "whatsapp_state" && value !== "") ||
    (field === "last_feedback" && value.trim() !== "");

  if (shouldAutoAssign) {
    updates.assigned_employee = user.id;
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
    .order("created_at", { ascending: false })
    .limit(5000);

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

  const { data: records, error } = await query.order("row_number", { ascending: true }).limit(10000);
  if (error) throw new Error("fetch-failed");

  const sorted = (list: UnconfirmedRecord[]) => [...list].sort((a, b) => {
    const nameA = (a.owner_name || "").trim();
    const nameB = (b.owner_name || "").trim();
    if (!nameA && !nameB) return 0;
    if (!nameA) return 1;
    if (!nameB) return -1;
    const aIsAr = /^[\u0600-\u06FF]/.test(nameA);
    const bIsAr = /^[\u0600-\u06FF]/.test(nameB);
    if (aIsAr && !bIsAr) return -1;
    if (!aIsAr && bIsAr) return 1;
    return nameA.localeCompare(nameB, "ar", { sensitivity: "base" });
  });

  if (options?.q) {
    const searchTerm = options.q.toLowerCase();
    const filtered = (records ?? []).filter((r) => {
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
    return sorted(filtered);
  }

  return sorted(records ?? []);
}
