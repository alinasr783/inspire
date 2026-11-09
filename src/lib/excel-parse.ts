import * as XLSX from "xlsx";

import type { PreviewResult, PreviewRow, UnconfirmedRecord } from "./unconfirmed-data-actions";

const COLUMN_ALIASES: Record<string, string[]> = {
  owner_name: [
    "owner name", "owner", "customer name", "customer", "client name", "client",
    "المالك", "اسم المالك", "العميل", "اسم العميل", "name", "full name",
    "الاسم", "اسم", "الاسم بالكامل", "اسم صاحب الوحده", "صاحب الوحده",
    "صاحب العقار", "المشتري", "اسم المشتري", "المستاجر", "الساكن",
  ],
  unit_area: [
    "unit area", "area", "area sqm", "property area", "المساحة", "مساحة الوحدة",
    "مساحة", "مساحه الشقه", "مساحه الارض", "مساحه المباني", "المتر", "متر",
    "area (sqm)", "sqm", "size", "bua", "land area",
  ],
  building_number: [
    "building number", "building no", "building", "block", "رقم المبنى", "رقم المبني",
    "رقم العمارة", "رقم العماره", "المبنى", "المبني", "مبنى", "مبني",
    "العمارة", "العماره", "عمارة", "عماره", "رقم العقار", "العقار",
    "رقم البلوك", "البلوك", "بلوك", "رقم القطعة", "القطعة", "قطعة",
    "رقم الفيلا", "الفيلا", "فيلا", "block number", "building #", "bldg", "plot", "parcel",
  ],
  unit_number: [
    "unit number", "unit no", "unit", "apartment number", "apartment no", "flat no",
    "رقم الوحدة", "الوحدة", "وحدة", "رقم الشقة", "رقم الشقه", "الشقة", "شقة",
    "كود الوحدة", "كود الوحده", "apartment", "flat", "apt", "unit code",
  ],
  owner_phone: [
    "owner phone", "phone", "phone number", "mobile", "mobile number", "tel", "telephone",
    "هاتف", "الهاتف", "رقم الهاتف", "رقم التليفون", "التليفون", "تليفون",
    "رقم الموبايل", "الموبايل", "موبايل", "موبيل", "الموبيل", "رقم الموبيل",
    "cell", "cell phone", "mobile no", "phone no", "رقم التواصل", "التواصل",
    "جوال", "الجوال", "رقم الجوال", "phone 1", "mobile 1", "رقم المالك",
    "تليفون المالك", "موبايل المالك", "رقم العميل", "تليفون العميل", "موبايل العميل",
    "ارقام التليفون", "ارقام الهاتف", "ارقام الموبايل", "واتس", "واتساب", "whatsapp",
    "contact number", "رقم 1", "رقم1",
  ],
  owner_phone_alt: [
    "alt phone", "phone 2", "phone alt", "alternative phone", "secondary phone",
    "هاتف بديل", "تليفون بديل", "موبايل بديل", "موبيل بديل", "phone2",
    "other phone", "second phone", "mobile 2", "mobile2", "alt mobile", "tel 2",
    "رقم بديل", "هاتف اخر", "تليفون اخر", "موبايل اخر", "موبيل اخر", "رقم اخر",
    "هاتف 2", "تليفون 2", "موبايل 2", "موبيل 2", "رقم 2", "رقم2",
    "رقم هاتف 2", "رقم تليفون 2", "رقم موبايل 2",
  ],
  affiliated_company: [
    "affiliated company", "company", "developer", "شركة", "الشركة", "الشركة التابعة",
    "المطور", "الشركة المطورة", "company name", "شركة المطور", "الكمبوند", "كمبوند",
    "المشروع", "مشروع", "اسم المشروع", "اسم الكمبوند", "اسم الشركة",
    "compound", "project", "project name", "القرية", "المرحلة", "المنطقة",
  ],
  last_feedback: [
    "last feedback", "feedback", "notes", "note", "comment", "comments",
    "ملاحظات", "الملاحظات", "ملاحظة", "فيدباك", "فيد باك", "التعليق", "تعليق",
    "رد العميل", "حالة العميل",
  ],
  last_contact_date: [
    "last contact date", "contact date", "date", "last contacted",
    "تاريخ", "التاريخ", "آخر تاريخ تواصل", "تاريخ الاتصال", "contacted",
    "last call", "اخر تواصل", "تاريخ التواصل", "تاريخ اخر تواصل",
  ],
};

const PHONE_KEYWORDS = [
  "phone", "mobile", "tel", "telephone", "هاتف", "تليفون", "موبايل",
  "جوال", "cell", "موبيل", "واتس", "whatsapp", "تواصل",
];

const NON_PHONE_NUMBER_KEYWORDS = [
  "دور", "طابق", "عقد", "مسلسل", "بطاقه", "قومي", "صفحه", "حساب", "طلب", "استماره",
];

/**
 * Arabic orthography normalization so headers like "رقم الوحده"/"رقم الوحدة"
 * or "المبني"/"المبنى" or "الأسم"/"الاسم" match the same alias. Applied to both
 * the incoming header and every alias before comparing.
 */
export function normalizeArText(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHeader(excelCol: string): string {
  return normalizeArText(
    excelCol
      .toLowerCase()
      .replace(/[_-]/g, " ")
      .replace(/[/:()[\]{}.,#\\|]+/g, " ")
  );
}

const NORMALIZED_ALIASES: Record<string, string[]> = Object.fromEntries(
  Object.entries(COLUMN_ALIASES).map(([fixed, aliases]) => [
    fixed,
    aliases.map((a) => cleanHeader(a)),
  ])
);

const NORMALIZED_PHONE_KEYWORDS = PHONE_KEYWORDS.map((k) => cleanHeader(k));

export function mapExcelColumn(excelCol: string): string {
  const cleaned = cleanHeader(excelCol);

  // Never let an empty header match via substring quirks
  // (`"".includes` / `alias.includes("")` is always true).
  if (!cleaned) return "";

  for (const [fixed, aliases] of Object.entries(NORMALIZED_ALIASES)) {
    if (aliases.includes(cleaned)) return fixed;
  }

  if (cleaned.includes("رقم")) {
    if (
      cleaned.includes("مبني") ||
      cleaned.includes("عماره") ||
      cleaned.includes("بلوك") ||
      cleaned.includes("قطعه") ||
      cleaned.includes("فيلا") ||
      cleaned.includes("عقار")
    ) {
      return "building_number";
    }
    if (
      cleaned.includes("وحده") ||
      cleaned.includes("شقه") ||
      cleaned.includes("apartment") ||
      cleaned.includes("flat")
    ) {
      return "unit_number";
    }
  }

  const isPhone = NORMALIZED_PHONE_KEYWORDS.some((kw) => cleaned.includes(kw));
  if (isPhone) {
    if (
      cleaned.includes("alt") ||
      cleaned.includes("2") ||
      cleaned.includes("بديل") ||
      cleaned.includes("اخر") ||
      cleaned.includes("ثاني")
    ) {
      return "owner_phone_alt";
    }
    return "owner_phone";
  }

  if (cleaned.includes("رقم")) {
    const isNonPhoneNum = NON_PHONE_NUMBER_KEYWORDS.some((kw) => cleaned.includes(kw));
    if (!isNonPhoneNum) {
      if (
        cleaned.includes("2") ||
        cleaned.includes("بديل") ||
        cleaned.includes("اخر") ||
        cleaned.includes("ثاني")
      ) {
        return "owner_phone_alt";
      }
      return "owner_phone";
    }
  }

  if (
    cleaned.includes("شركه") ||
    cleaned.includes("كمبوند") ||
    cleaned.includes("مشروع") ||
    cleaned.includes("مطور") ||
    cleaned.includes("compound") ||
    cleaned.includes("project") ||
    cleaned.includes("developer") ||
    cleaned.includes("company")
  ) {
    return "affiliated_company";
  }

  for (const [fixed, aliases] of Object.entries(NORMALIZED_ALIASES)) {
    if (aliases.some((a) => a.length >= 3 && (cleaned.includes(a) || a.includes(cleaned)))) {
      return fixed;
    }
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

export function isLikelyPhone(val: unknown): boolean {
  if (val == null) return false;
  const s = String(val).trim();
  if (!s) return false;
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15) return true;
  if (
    digits.length >= 8 &&
    (digits.startsWith("01") || digits.startsWith("1") || digits.startsWith("20") || s.startsWith("+") || s.startsWith("00"))
  ) {
    return true;
  }
  return false;
}

export function parseExtraData(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") {
        try {
          return (JSON.parse(parsed) || {}) as Record<string, unknown>;
        } catch {
          return {};
        }
      }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export interface HydratedRecordResult {
  record: UnconfirmedRecord;
  dbUpdates: Record<string, unknown>;
  mappedExtraKeys: Set<string>;
}

/**
 * Hydrates empty standard fields on an `UnconfirmedRecord` from `record.extra_data`
 * and repairs any columns that were mistakenly misassigned (e.g. customer name
 * mistakenly placed in `owner_phone` or unit area placed in `owner_phone_alt`).
 *
 * Safely parses stringified `extra_data`, recovers all fields, normalizes phones,
 * and outputs `dbUpdates` ready for Supabase persistence.
 */
export function hydrateRecordFromExtraData(rawRecord: UnconfirmedRecord): HydratedRecordResult {
  const extra = parseExtraData(rawRecord.extra_data);
  const hydrated: UnconfirmedRecord = { ...rawRecord, extra_data: extra };
  const dbUpdates: Record<string, unknown> = {};
  const mappedExtraKeys = new Set<string>();

  // If extra_data was stored as a JSON string scalar in the database, update it to a proper object
  if (typeof rawRecord.extra_data === "string" && Object.keys(extra).length > 0) {
    dbUpdates.extra_data = extra;
  }

  const isEmptyField = (field: string): boolean => {
    const cur = (hydrated as Record<string, unknown>)[field];
    return cur == null || String(cur).trim() === "";
  };

  const setField = (field: string, val: string, sourceKey: string) => {
    const cleanVal = String(val ?? "").trim();
    (hydrated as Record<string, unknown>)[field] = cleanVal;
    dbUpdates[field] = cleanVal;
    if (sourceKey) mappedExtraKeys.add(sourceKey);
  };

  // --------------------------------------------------------------------------
  // Step 1: Detect and fix misplaced fields in the record itself.
  // When an Excel file with blank/no headers was uploaded, the old parser mapped:
  //   __EMPTY   -> owner_phone  (which is actually the customer's NAME!)
  //   __EMPTY_1 -> owner_phone_alt (which is actually the unit AREA, e.g. 59, 121!)
  // --------------------------------------------------------------------------
  const rawPhone = String(hydrated.owner_phone ?? "").trim();
  const rawPhoneDigits = rawPhone.replace(/\D/g, "");
  const rawPhoneHasLetters = /[a-zA-Z\u0600-\u06FF]/.test(rawPhone);

  if (rawPhoneHasLetters && rawPhoneDigits.length < 7) {
    if (isEmptyField("owner_name")) {
      setField("owner_name", rawPhone, "owner_phone_misplaced");
    }
    hydrated.owner_phone = "";
    dbUpdates.owner_phone = "";
    hydrated.phone_normalized = "";
    dbUpdates.phone_normalized = "";
  }

  const rawPhoneAlt = String(hydrated.owner_phone_alt ?? "").trim();
  const rawPhoneAltDigits = rawPhoneAlt.replace(/\D/g, "");
  const rawPhoneAltHasLetters = /[a-zA-Z\u0600-\u06FF]/.test(rawPhoneAlt);

  if (rawPhoneAlt && (rawPhoneAltDigits.length < 6 || rawPhoneAltHasLetters)) {
    if (isEmptyField("unit_area") && /^\d{1,4}$/.test(rawPhoneAlt)) {
      setField("unit_area", rawPhoneAlt, "owner_phone_alt_misplaced");
    }
    hydrated.owner_phone_alt = "";
    dbUpdates.owner_phone_alt = "";
    hydrated.phone_alt_normalized = "";
    dbUpdates.phone_alt_normalized = "";
  }

  // --------------------------------------------------------------------------
  // Step 2: Special recovery for files with __EMPTY layout (e.g. file 6f4ff5e6-...)
  //   __EMPTY    = Customer Name
  //   __EMPTY_1  = Unit Area (sqm)
  //   __EMPTY_3  = Unit Number
  //   __EMPTY_4  = Building Number
  //   __EMPTY_5  = Phone 1
  //   __EMPTY_6  = Phone 2
  //   __EMPTY_19, 21, 22 = Feedback
  //   __EMPTY_25 = Contact Date
  // --------------------------------------------------------------------------
  if (extra["__EMPTY"] !== undefined || extra["__EMPTY_1"] !== undefined || extra["__EMPTY_5"] !== undefined) {
    const rawEmpty = toStr(extra["__EMPTY"]).trim();
    if (rawEmpty && isEmptyField("owner_name") && !isLikelyPhone(rawEmpty)) {
      setField("owner_name", rawEmpty, "__EMPTY");
    }

    const rawArea = toStr(extra["__EMPTY_1"]).trim();
    if (rawArea && isEmptyField("unit_area") && /^\d{1,4}(\.\d+)?$/.test(rawArea)) {
      setField("unit_area", rawArea, "__EMPTY_1");
    }

    const rawUnit = toStr(extra["__EMPTY_3"]).trim();
    if (rawUnit && isEmptyField("unit_number")) {
      setField("unit_number", rawUnit, "__EMPTY_3");
    }

    const rawBldg = toStr(extra["__EMPTY_4"]).trim();
    if (rawBldg && isEmptyField("building_number")) {
      setField("building_number", rawBldg, "__EMPTY_4");
    }

    const rawP5 = toStr(extra["__EMPTY_5"]).trim();
    if (rawP5 && isLikelyPhone(rawP5)) {
      if (isEmptyField("owner_phone")) {
        setField("owner_phone", rawP5, "__EMPTY_5");
      }
    }

    const rawP6 = toStr(extra["__EMPTY_6"]).trim();
    if (rawP6 && isLikelyPhone(rawP6)) {
      if (isEmptyField("owner_phone_alt") && hydrated.owner_phone !== rawP6) {
        setField("owner_phone_alt", rawP6, "__EMPTY_6");
      }
    }

    if (isEmptyField("last_feedback")) {
      const fbs = [extra["__EMPTY_22"], extra["__EMPTY_21"], extra["__EMPTY_19"]]
        .map((s) => toStr(s).trim())
        .filter(Boolean);
      if (fbs.length > 0) {
        setField("last_feedback", Array.from(new Set(fbs)).join(" - "), "__EMPTY_19");
      }
    }

    const rawDate = toStr(extra["__EMPTY_25"]).trim();
    if (rawDate && isEmptyField("last_contact_date")) {
      setField("last_contact_date", rawDate, "__EMPTY_25");
    }

    // Mark intermediate helper columns so they don't appear as raw "__EMPTY_x" columns
    [
      "__EMPTY", "__EMPTY_1", "__EMPTY_2", "__EMPTY_3", "__EMPTY_4", "__EMPTY_5",
      "__EMPTY_6", "__EMPTY_19", "__EMPTY_20", "__EMPTY_21", "__EMPTY_22",
      "__EMPTY_23", "__EMPTY_24", "__EMPTY_25",
    ].forEach((k) => mappedExtraKeys.add(k));
  }

  // --------------------------------------------------------------------------
  // Step 3: Value-based phone search across all keys in extra_data
  // --------------------------------------------------------------------------
  for (const [key, rawVal] of Object.entries(extra)) {
    const val = toStr(rawVal).trim();
    if (!val || !isLikelyPhone(val)) continue;

    if (isEmptyField("owner_phone")) {
      setField("owner_phone", val, key);
    } else if (
      isEmptyField("owner_phone_alt") &&
      String(hydrated.owner_phone ?? "").trim() !== val
    ) {
      setField("owner_phone_alt", val, key);
    } else if (
      String(hydrated.owner_phone ?? "").trim() === val ||
      String(hydrated.owner_phone_alt ?? "").trim() === val
    ) {
      mappedExtraKeys.add(key);
    }
  }

  // --------------------------------------------------------------------------
  // Step 4: Named headers in extra_data that map to FIXED_COLUMNS
  // --------------------------------------------------------------------------
  for (const [key, rawVal] of Object.entries(extra)) {
    if (isBlankHeader(key)) continue;
    const fixed = mapExcelColumn(key);
    if (!fixed || !FIXED_COLUMNS.includes(fixed)) continue;

    const val = toStr(rawVal).trim();
    if (!val) {
      mappedExtraKeys.add(key);
      continue;
    }

    // Guard against serial-number columns ("رقم" = 1, 2, 3...) claiming phone slots
    if (fixed === "owner_phone" || fixed === "owner_phone_alt") {
      if (!isLikelyPhone(val)) continue;
    }

    if (isEmptyField(fixed)) {
      setField(fixed, val, key);
    } else if (String((hydrated as Record<string, unknown>)[fixed] ?? "").trim() === val) {
      mappedExtraKeys.add(key);
    } else if (
      (fixed === "owner_phone" || fixed === "owner_phone_alt") &&
      isEmptyField("owner_phone_alt") &&
      String(hydrated.owner_phone ?? "").trim() !== val
    ) {
      setField("owner_phone_alt", val, key);
    }
  }

  // --------------------------------------------------------------------------
  // Step 5: Normalize Egyptian phone numbers
  // --------------------------------------------------------------------------
  const phoneVal = String(hydrated.owner_phone ?? "").trim();
  if (phoneVal) {
    const norm = normalizeEgyptianPhone(phoneVal);
    if (norm && (isEmptyField("phone_normalized") || String(rawRecord.phone_normalized ?? "") !== norm)) {
      hydrated.phone_normalized = norm;
      dbUpdates.phone_normalized = norm;
    }
  }

  const phoneAltVal = String(hydrated.owner_phone_alt ?? "").trim();
  if (phoneAltVal) {
    const normAlt = normalizeEgyptianPhone(phoneAltVal);
    if (normAlt && (isEmptyField("phone_alt_normalized") || String(rawRecord.phone_alt_normalized ?? "") !== normAlt)) {
      hydrated.phone_alt_normalized = normAlt;
      dbUpdates.phone_alt_normalized = normAlt;
    }
  }

  return { record: hydrated, dbUpdates, mappedExtraKeys };
}

export function buildPreviewRows(
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
