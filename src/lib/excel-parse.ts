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

/**
 * Arabic orthography normalization so headers like "رقم الوحده"/"رقم الوحدة"
 * or "المبني"/"المبنى" match the same alias. Applied to both the incoming
 * header and every alias before comparing.
 */
export function normalizeArText(s: string): string {
  return s
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHeader(excelCol: string): string {
  return normalizeArText(excelCol.toLowerCase().replace(/[_-]/g, " "));
}

const NORMALIZED_ALIASES: Record<string, string[]> = Object.fromEntries(
  Object.entries(COLUMN_ALIASES).map(([fixed, aliases]) => [
    fixed,
    aliases.map((a) => normalizeArText(a.toLowerCase())),
  ])
);

const NORMALIZED_PHONE_KEYWORDS = PHONE_KEYWORDS.map((k) => normalizeArText(k.toLowerCase()));

export function mapExcelColumn(excelCol: string): string {
  const cleaned = cleanHeader(excelCol);

  // Never let an empty header match via substring quirks
  // (`"".includes` / `alias.includes("")` is always true).
  if (!cleaned) return "";

  for (const [fixed, aliases] of Object.entries(NORMALIZED_ALIASES)) {
    if (aliases.includes(cleaned)) return fixed;
  }

  if (cleaned.includes("رقم")) {
    if (cleaned.includes("مبني") || cleaned.includes("عماره")) {
      return "building_number";
    }
    if (cleaned.includes("وحده") || cleaned.includes("شقه") || cleaned.includes("apartment")) {
      return "unit_number";
    }
  }

  const isPhone = NORMALIZED_PHONE_KEYWORDS.some((kw) => cleaned.includes(kw));
  if (isPhone) {
    if (cleaned.includes("alt") || cleaned.includes("2") || cleaned.includes("بديل") || cleaned.includes("اخر") || cleaned.includes("ثاني")) {
      return "owner_phone_alt";
    }
    return "owner_phone";
  }

  if (cleaned.includes("رقم")) return "owner_phone";

  for (const [fixed, aliases] of Object.entries(NORMALIZED_ALIASES)) {
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

/**
 * Blank headers arrive as `""`, `"  "`, `"_1"`, `"_2"` (xlsx dedupes repeated
 * blanks by suffixing `_N`), or `__EMPTY...` on other xlsx versions.
 */
export function isBlankHeader(header: string): boolean {
  return /^(\s*__EMPTY(_\d+)?\s*|\s*_\d+\s*|\s*)$/.test(header);
}

/** System phone slots that blank headers can claim, in order. */
const PHONE_FALLBACK_SLOTS = ["owner_phone", "owner_phone_alt"];

/**
 * Display label for an `extra_data` key in the final tables.
 * Blank Excel headers (`""`, `"_1"`, `"__EMPTY..."`) hold phone numbers, so
 * they are shown as "رقم الهاتف" instead of the raw technical key.
 * `blankIndex` is the 0-based position among blank keys; callers pass it so
 * multiple blank columns are disambiguated ("رقم الهاتف", "رقم الهاتف 2"...).
 */
export function extraDataColumnLabel(key: string, blankIndex?: number): string {
  if (isBlankHeader(key)) {
    if (blankIndex != null && blankIndex > 0) return `رقم الهاتف ${blankIndex + 1}`;
    return "رقم الهاتف";
  }
  return key;
}

function buildPreviewRows(
  jsonData: Record<string, string>[],
  headers: string[],
  fixedOf: (header: string) => string = mapExcelColumn
): PreviewRow[] {
  return jsonData.map((row) => {
    const mapped: Record<string, string> = {};
    const extraData: Record<string, unknown> = {};
    for (const excelCol of headers) {
      const val = toStr(row[excelCol]);
      const fixed = fixedOf(excelCol);
      if (fixed && FIXED_COLUMNS.includes(fixed)) {
        // First non-empty value wins: two excel columns may map to the same
        // system field (e.g. "Name" + "اسم المالك"). Overwriting silently put
        // one column's data in the other's place.
        if (val) {
          if (!(fixed in mapped) || !mapped[fixed]) {
            mapped[fixed] = val;
          } else if (mapped[fixed] !== val) {
            // Duplicate target with a *different* value: preserve the losing
            // value under its original excel header so the final table shows
            // every column instead of silently dropping it. The preview keeps
            // showing the merged column (with the duplicate badge).
            if (!(excelCol in extraData)) extraData[excelCol] = val;
          }
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

  const rawHeaders = Object.keys(allRows[0]);
  const isNonEmpty = (col: string) =>
    allRows.some((row) => (row[col] ?? "").toString().trim() !== "");

  // Named phone columns that actually hold data claim their slot, so blank
  // headers skip them. (Fully-empty named columns are dropped below and must
  // not consume a slot.)
  const namedPhoneClaimed = new Set<string>();
  for (const key of rawHeaders) {
    if (isBlankHeader(key) || !isNonEmpty(key)) continue;
    const fixed = mapExcelColumn(key);
    if (fixed === "owner_phone" || fixed === "owner_phone_alt") {
      namedPhoneClaimed.add(fixed);
    }
  }
  const freeBlankSlots = PHONE_FALLBACK_SLOTS.filter((s) => !namedPhoneClaimed.has(s)).length;

  // Drop fully-empty columns — except blank-header columns while phone slots
  // remain free. Those are kept even when empty so they still appear as a
  // "رقم الهاتف" column in the preview and in the final table.
  let blanksSeen = 0;
  const headers = rawHeaders.filter((col) => {
    if (isBlankHeader(col)) {
      blanksSeen++;
      if (blanksSeen <= freeBlankSlots) return true;
    }
    return isNonEmpty(col);
  });

  if (headers.length === 0) {
    throw new Error("no-valid-columns");
  }

  // Resolve every header to a system field in two passes:
  //  1. named columns use the normal mapping,
  //  2. blank headers claim the phone slots in order
  //     (first blank -> owner_phone, next -> owner_phone_alt),
  //     skipping slots already claimed by named columns.
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
  const columns: Array<{ key: string; label: string; type: "text"; target: string; targetDuplicate: boolean }> = [];
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
          // Blank header with no free phone slot (third blank and beyond):
          // kept as an extra column, still labelled as a phone column.
          blankPhoneLabel = extraDataColumnLabel(key, blankOverflowSeen);
          blankOverflowSeen++;
        }
      }
      columns.push({
        key: colKey,
        label: blankPhoneLabel ?? key.replace(/[_-]/g, " ").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        type: "text" as const,
        target: fixed || "",
        targetDuplicate: false,
      });
    } else if (fixed) {
      // A second excel column maps to the same system field — flag the
      // existing column so the preview can warn about the merge.
      const existing = columns.find((c) => c.key === colKey);
      if (existing) existing.targetDuplicate = true;
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

  const previewRows = buildPreviewRows(cleanRows, headers, fixedOf);

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
