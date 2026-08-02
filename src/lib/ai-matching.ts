"use server";

import { callDeepSeek } from "@/lib/deepseek-client";
import { createAdminClient } from "@/lib/supabase/admin";

export type AIMatchResult = {
  client_id: string;
  client_name: string;
  client_phone: string;
  client_budget: string;
  client_type: string;
  top_units: {
    unit_id: string;
    rank: number;
    score: number;
    reasoning: string;
    unit_name: string;
    unit_compound: string;
    unit_type: string;
    unit_finishing: string;
    unit_area: string;
    unit_price: string;
    unit_rent_sale: string;
    unit_phone: string;
  }[];
};

function sanitizeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ").slice(0, 200);
}

function stripMarkdownFences(text: string): string {
  let t = text.trim();

  const fenceMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  if (t.startsWith("```")) {
    t = t.slice(3);
    if (t.startsWith("json")) t = t.slice(4);
    if (t.endsWith("```")) t = t.slice(0, -3);
    t = t.trim();
  }

  return t;
}

function repairTruncatedJSON(text: string): string {
  let t = text.trim();

  if (!t.startsWith("[")) {
    const start = t.indexOf("[");
    if (start >= 0) t = t.slice(start);
    else return "[]";
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
  }

  while (depth > 0) {
    const lastChar = t.trimEnd().slice(-1);
    if (lastChar === ",") {
      t = t.trimEnd().slice(0, -1).trimEnd();
    }
    if (depth >= 2) t += '}]';
    else if (depth === 1) t += ']';
    depth = 0;

    try { JSON.parse(t); return t; } catch { depth--; continue; }
  }

  try { JSON.parse(t); return t; } catch {}

  const lastComma = t.lastIndexOf(",");
  if (lastComma > 0) {
    try { JSON.parse(t.slice(0, lastComma) + "]"); return t.slice(0, lastComma) + "]"; } catch {}
  }

  return t + "]";
}

function repairAndParseJSON(text: string): unknown[] | null {
  const clean = stripMarkdownFences(text);

  const strategies: (() => unknown | null)[] = [
    () => { const r = JSON.parse(clean); return r; },
    () => {
      const fixed = repairTruncatedJSON(clean);
      return JSON.parse(fixed);
    },
    () => {
      const match = clean.match(/\[[\s\S]*\]/);
      if (!match) return null;
      const fixed = repairTruncatedJSON(match[0]);
      return JSON.parse(fixed);
    },
    () => {
      const match = clean.match(/\[[\s\S]*?\]/);
      if (!match) return null;
      const fixed = match[0].replace(/,(\s*[}\]])/g, "$1");
      return JSON.parse(fixed);
    },
  ];

  for (const strategy of strategies) {
    try {
      const result = strategy();
      if (Array.isArray(result)) return result;
    } catch {
      continue;
    }
  }

  return null;
}

const SYSTEM_PROMPT = `أنت خبير عقاري مصري محترف تعمل لدى شركة "إنسباير" العقارية. مهمتك هي مطابقة العقارات المتاحة مع العملاء المحتملين بأعلى دقة ممكنة.

## دورك وهدفك
أنت محلل عقاري ذكي تفهم السوق المصري جيداً. هدفك هو إيجاد أفضل 3 وحدات عقارية متطابقة لكل عميل بناءً على تحليل عميق لجميع البيانات المتاحة.

## كيفية تحليل البيانات

### بيانات العميل:
- **customer_name**: اسم العميل
- **phone / phone_alt**: أرقام التواصل
- **budget_from / budget_to**: نطاق الميزانية
- **payment_method**: طريقة الدفع (كاش / تقسيط)
- **preferred_area**: المنطقة المفضلة للسكن
- **unit_type**: نوع الوحدة المطلوبة (شقة / فيلا / دوبلكس / مكتب / أرض / تجاري)
- **bedrooms**: عدد غرف النوم المطلوبة
- **preferred_developer**: المطور العقاري المفضل
- **source**: مصدر جلب العميل
- **additional_notes**: ملاحظات إضافية
- **last_contact_date**: تاريخ آخر تواصل

### بيانات الوحدة العقارية:
- **customer_name**: اسم المالك
- **phone**: رقم التواصل
- **area**: المساحة بالمتر المربع
- **building_number**: رقم العمارة / عدد الغرف
- **finishing_status**: حالة التشطيب (كامل / نصف تشطيب / على الطوب / تحت الإنشاء)
- **rent_sale**: نوع المعاملة (إيجار / بيع)
- **unit_type**: نوع الوحدة
- **cash_required**: المبلغ المطلوب كاش (مقدم)
- **remaining**: المبلغ المتبقي
- **compound_name**: اسم الكمبوند / المنطقة
- **additional_notes**: ملاحظات إضافية
- **feedback**: فيد باك من العملاء السابقين
- **last_contact_date**: تاريخ آخر تواصل

## معايير التقييم (مرتبة حسب الأهمية)

1. **الميزانية (40%)**: مدى توافق سعر الوحدة (cash_required + remaining) مع ميزانية العميل.
2. **نوع الوحدة والتشطيب (20%)**: تطابق نوع الوحدة مع طلب العميل. التشطيب الكامل أفضل.
3. **الموقع والمنطقة (20%)**: تطابق المنطقة مع تفضيلات العميل.
4. **المساحة والغرف (10%)**: توافق المساحة مع عدد الغرف المطلوبة.
5. **جودة البيانات والحداثة (10%)**: كلما كانت بيانات الوحدة أحدث، كلما كانت النتيجة أعلى.

## قواعد مهمة
- ممنوع مطابقة عميل بوحدة سعرها أعلى من budget_to بأكثر من 30%
- إذا كان العميل يبحث عن "إيجار"، لا تطابقه مع وحدات "بيع" والعكس
- إذا كان العميل حدد bedrooms، حاول تطابقها مع building_number للوحدة
- اقرأ additional_notes وfeedback بعناية - قد تحتوي معلومات حاسمة
- أعط score من 0 إلى 100 بناءً على التحليل الشامل
- اكتب reasoning واضح ومفيد بالعربية يشرح سبب الترشيح

## صيغة الإخراج - مهم جداً

أرجع JSON array فقط، لا تكتب أي نص آخر قبل أو بعد الـ JSON:

[{"client_id":"uuid","client_name":"اسم","top_units":[{"unit_id":"uuid","rank":1,"score":85,"reasoning":"شرح بالعربي"}]}]

ملاحظات مهمة للإخراج:
- استخدم double quotes فقط
- لا تستخدم فواصل في نهاية العناصر
- لا تستخدم escaping معقد، اكتب النص العربي مباشرة
- لكل عميل، أرجع أفضل 3 وحدات فقط
- إذا لم تجد وحدات مناسبة، أرجع top_units: []`;

async function buildCompactData(admin: ReturnType<typeof createAdminClient>) {
  const [{ data: clients }, { data: units }] = await Promise.all([
    admin.from("clients").select("*"),
    admin.from("units").select("*"),
  ]);

  if (!clients?.length || !units?.length) return { clients: null, units: null };

  const clientsCompact = clients.map((c) => ({
    id: c.id,
    n: c.customer_name,
    ph: c.phone,
    bud: [c.budget_from ?? 0, c.budget_to ?? 0],
    pay: c.payment_method ?? "",
    area: c.preferred_area ?? "",
    type: c.unit_type ?? "",
    bed: c.bedrooms ?? "",
    dev: c.preferred_developer ?? "",
    notes: sanitizeText(c.additional_notes ?? ""),
    last: c.last_contact_date ?? "",
  }));

  const unitsCompact = units.map((u) => ({
    id: u.id,
    n: u.customer_name,
    ph: u.phone,
    msq: u.area ?? "",
    bld: u.building_number ?? "",
    fin: u.finishing_status ?? "",
    rs: u.rent_sale ?? "",
    type: u.unit_type ?? "",
    cash: u.cash_required ?? 0,
    rem: u.remaining ?? 0,
    comp: u.compound_name ?? "",
    notes: sanitizeText(u.additional_notes ?? ""),
    fb: sanitizeText(u.feedback ?? ""),
    last: u.last_contact_date ?? "",
  }));

  return { clients: clientsCompact, units: unitsCompact };
}

export async function runAIMatching(clientIds?: string[]): Promise<{
  success: boolean;
  matches: AIMatchResult[];
  error?: string;
}> {
  const admin = createAdminClient();
  const { clients: allClients, units: allUnits } = await buildCompactData(admin);

  if (!allClients) return { success: false, matches: [], error: "No clients found" };
  if (!allUnits) return { success: false, matches: [], error: "No units found" };

  const clients = clientIds?.length
    ? allClients.filter((c: { id: string }) => clientIds.includes(c.id))
    : allClients;

  if (!clients.length) return { success: false, matches: [], error: "No clients selected" };

  const fullUnits = allUnits as {
    id: string; n: string; comp: string; type: string; fin: string;
    msq: string; cash: number; rem: number; rs: string; ph: string;
  }[];

  const unitLookup = new Map(fullUnits.map((u) => [u.id, u]));
  const clientLookup = new Map(
    (allClients as { id: string; n: string; ph: string; bud: number[]; type: string }[]).map((c) => [c.id, c])
  );

  const fieldMap = `
مفاتيح مختصرة:
العملاء: n=اسم, ph=تليفون, bud=[من,إلى], pay=دفع, area=منطقة, type=نوع, bed=غرف, dev=مطور, notes=ملاحظات, last=آخ اتصال
الوحدات: n=مالك, ph=تليفون, msq=مساحة, bld=عمارة, fin=تشطيب, rs=إيجار/بيع, type=نوع, cash=مقدم, rem=متبقي, comp=كمبوند, notes=ملاحظات, fb=فيدباك, last=آخر اتصال`;

  const BATCH_SIZE = 3;
  const allMatches: AIMatchResult[] = [];

  const clientBatches: (typeof clients)[] = [];
  for (let i = 0; i < clients.length; i += BATCH_SIZE) {
    clientBatches.push(clients.slice(i, i + BATCH_SIZE));
  }

  for (let bi = 0; bi < clientBatches.length; bi++) {
    const batch = clientBatches[bi];

    const userMessage = `${fieldMap}

## عملاء الدفعة ${bi + 1}/${clientBatches.length} (${batch.length} عملاء)
${JSON.stringify(batch)}

## الوحدات العقارية المتاحة (${fullUnits.length})
${JSON.stringify(fullUnits)}

لكل عميل، اختر أفضل 3 وحدات مناسبة. أرجع JSON array فقط. لا تكتب شرح، لا markdown.`;

    try {
      const content = await callDeepSeek(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        { maxTokens: 8000, temperature: 0.3 }
      );

      const parsed = repairAndParseJSON(content);
      if (!parsed) continue;

      for (const item of parsed) {
        const m = item as Record<string, unknown>;
        const cId = String(m.client_id ?? "");
        const cl = clientLookup.get(cId);

        const topUnits = Array.isArray(m.top_units) ? (m.top_units as Record<string, unknown>[]) : [];

        allMatches.push({
          client_id: cId,
          client_name: String(m.client_name ?? cl?.n ?? ""),
          client_phone: cl?.ph ?? "",
          client_budget: cl ? `${cl.bud[0]} - ${cl.bud[1]}` : "",
          client_type: cl?.type ?? "",
          top_units: topUnits.map((u) => {
            const uId = String(u.unit_id ?? "");
            const ul = unitLookup.get(uId);
            const totalPrice = (ul?.cash ?? 0) + (ul?.rem ?? 0);
            return {
              unit_id: uId,
              rank: Number(u.rank ?? 0),
              score: Number(u.score ?? 0),
              reasoning: String(u.reasoning ?? ""),
              unit_name: ul?.n ?? uId.slice(0, 8),
              unit_compound: ul?.comp ?? "",
              unit_type: ul?.type ?? "",
              unit_finishing: ul?.fin ?? "",
              unit_area: ul?.msq ?? "",
              unit_price: ul ? `${totalPrice.toLocaleString()}` : "",
              unit_rent_sale: ul?.rs ?? "",
              unit_phone: ul?.ph ?? "",
            };
          }),
        });
      }
    } catch (err: unknown) {
      console.warn(`[AI Matching] Batch ${bi + 1} error:`, err instanceof Error ? err.message : String(err));
    }
  }

  if (allMatches.length === 0) {
    return { success: false, matches: [], error: "No matches could be generated" };
  }

  return { success: true, matches: allMatches };
}

export async function saveSelectedMatches(
  matches: {
    client_id: string;
    unit_id: string;
    rank: number;
    score: number;
    reasoning: string;
  }[],
  userId: string
): Promise<{ success: boolean; saved: number; error?: string }> {
  const admin = createAdminClient();

  const rows = matches.map((m) => ({
    client_id: m.client_id,
    property_id: m.unit_id,
    rank: m.rank,
    final_score: m.score,
    system_score: 0,
    ai_score: m.score,
    ai_confidence: 85,
    budget_match: 0,
    unit_type_match: 0,
    bedrooms_match: 0,
    freshness_score: 0,
    hard_filter_results: {},
    ai_analysis: { reasoning: m.reasoning },
    recommendation_status: "pending",
    created_by: userId,
  }));

  const { error } = await admin.from("generated_deals").upsert(rows, {
    onConflict: "client_id, property_id",
  });

  if (error) {
    console.error("[saveSelectedMatches] Error:", error);
    return { success: false, saved: 0, error: "save_failed" };
  }

  return { success: true, saved: rows.length };
}
