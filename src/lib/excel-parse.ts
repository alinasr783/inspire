import * as XLSX from "xlsx";

import type { PreviewResult, PreviewRow } from "./unconfirmed-data-actions";

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

export function mapExcelColumn(excelCol: string): string {
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

export const FIXED_COLUMNS = [
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

export function normalizeEgyptianPhone(phone: unknown): string {
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

/**
 * Pure Excel parser — safe to run on client or server.
 * Throws coded errors: "excel-corrupt" | "excel-empty" | "no-valid-columns".
 */
export function parseExcelBuffer(data: ArrayBuffer | Uint8Array, fileName: string): PreviewResult {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { type: "array" });
  } catch {
    throw new Error("excel-corrupt");
  }

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

  if (headers.length === 0) {
    throw new Error("no-valid-columns");
  }

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
    sourceFile: fileName,
  };
}
