import { createAdminClient } from "@/lib/supabase/admin";
import type { UnitRow } from "@/lib/unit-actions";
import { getDefaultUserId } from "@/lib/mcp/utils";
import type {
  CreateUnitInput,
  SearchUnitsParams,
  UpdateUnitPayload,
} from "@/lib/mcp/schemas";

const TABLE = "units";

export type SearchUnitsResult = {
  rows: UnitRow[];
  total: number;
};

function sanitizeLike(value: string): string {
  return value.replace(/[,().%_]/g, " ").trim();
}

type Admin = ReturnType<typeof createAdminClient>;
type FilterQuery = ReturnType<ReturnType<Admin["from"]>["select"]>;

function applyFilters(
  query: FilterQuery,
  params: SearchUnitsParams,
  duplicatePhones: string[] | null
): FilterQuery {
  let q = query;

  if (params.query) {
    const search = sanitizeLike(params.query);
    if (search) {
      const orFilter = ["customer_name", "phone", "compound_name", "additional_notes", "feedback"]
        .map((col) => `${col}.ilike.%${search}%`)
        .join(",");
      q = q.or(orFilter);
    }
  }
  if (params.customer_name) q = q.ilike("customer_name", `%${params.customer_name}%`);
  if (params.phone) q = q.ilike("phone", `%${params.phone}%`);
  if (params.compound_name) q = q.ilike("compound_name", `%${params.compound_name}%`);
  if (params.area) q = q.ilike("area", `%${params.area}%`);
  if (params.building_number) q = q.ilike("building_number", `%${params.building_number}%`);
  if (params.finishing_status) q = q.eq("finishing_status", params.finishing_status);
  if (params.rent_sale) q = q.eq("rent_sale", params.rent_sale);
  if (params.unit_type) q = q.eq("unit_type", params.unit_type);
  if (params.assigned_employee) q = q.eq("assigned_employee", params.assigned_employee);
  if (params.created_by) q = q.eq("created_by", params.created_by);
  if (params.cash_required_min != null) q = q.gte("cash_required", params.cash_required_min);
  if (params.cash_required_max != null) q = q.lte("cash_required", params.cash_required_max);
  if (params.remaining_min != null) q = q.gte("remaining", params.remaining_min);
  if (params.remaining_max != null) q = q.lte("remaining", params.remaining_max);
  if (params.last_contact_from) q = q.gte("last_contact_date", params.last_contact_from);
  if (params.last_contact_to) q = q.lte("last_contact_date", params.last_contact_to);

  if (params.custom_fields) {
    for (const [key, value] of Object.entries(params.custom_fields)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");
      const v = sanitizeLike(value);
      if (v) q = q.ilike(`custom_fields->>${safeKey}`, `%${v}%`);
    }
  }

  if (duplicatePhones) {
    q = duplicatePhones.length > 0 ? q.in("phone", duplicatePhones) : q.in("phone", ["__none__"]);
  }

  return q;
}

async function findDuplicatePhones(
  admin: ReturnType<typeof createAdminClient>
): Promise<string[]> {
  const { data: phoneRows } = await admin
    .from(TABLE)
    .select("phone")
    .not("phone", "is", null)
    .not("phone", "eq", "");
  const counts = new Map<string, number>();
  for (const r of phoneRows ?? []) {
    const p = String((r as { phone: unknown }).phone ?? "");
    if (!p) continue;
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, c]) => c > 1).map(([p]) => p);
}

export async function searchUnits(params: SearchUnitsParams): Promise<SearchUnitsResult> {
  const admin = createAdminClient();

  const duplicatePhones = params.duplicate_phone
    ? await findDuplicatePhones(admin)
    : null;

  const countBase = admin
    .from(TABLE)
    .select("id", { count: "exact", head: true }) as unknown as FilterQuery;
  const countRes = await applyFilters(countBase, params, duplicatePhones);
  const total = (countRes as unknown as { count: number | null }).count ?? 0;

  const dataQuery = applyFilters(admin.from(TABLE).select("*"), params, duplicatePhones);
  const orderCol = params.sort_by ?? "created_at";
  dataQuery.order(orderCol, { ascending: (params.sort_order ?? "desc") === "asc" });

  const offset = params.offset ?? 0;
  const limit = params.limit ?? 50;
  dataQuery.range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw new Error(error.message);

  return {
    rows: (data ?? []) as UnitRow[],
    total,
  };
}

export async function getUnitById(id: string): Promise<UnitRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as UnitRow | null) ?? null;
}

export async function createUnit(input: CreateUnitInput): Promise<UnitRow> {
  const admin = createAdminClient();
  const created_by = getDefaultUserId();

  const { data, error } = await admin
    .from(TABLE)
    .insert({
      customer_name: input.customer_name,
      phone: input.phone,
      compound_name: input.compound_name,
      area: input.area ?? "",
      building_number: input.building_number ?? "",
      finishing_status: input.finishing_status ?? "",
      rent_sale: input.rent_sale ?? "",
      unit_type: input.unit_type ?? "",
      cash_required: input.cash_required ?? null,
      remaining: input.remaining ?? null,
      last_contact_date: input.last_contact_date ?? null,
      additional_notes: input.additional_notes ?? "",
      feedback: input.feedback ?? "",
      assigned_employee: input.assigned_employee ?? null,
      custom_fields: input.custom_fields ?? {},
      created_by,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as UnitRow;
}

export async function updateUnit(id: string, input: UpdateUnitPayload): Promise<UnitRow | null> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.customer_name !== undefined) patch.customer_name = input.customer_name;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.compound_name !== undefined) patch.compound_name = input.compound_name;
  if (input.area !== undefined) patch.area = input.area;
  if (input.building_number !== undefined) patch.building_number = input.building_number;
  if (input.finishing_status !== undefined) patch.finishing_status = input.finishing_status;
  if (input.rent_sale !== undefined) patch.rent_sale = input.rent_sale;
  if (input.unit_type !== undefined) patch.unit_type = input.unit_type;
  if (input.cash_required !== undefined) patch.cash_required = input.cash_required;
  if (input.remaining !== undefined) patch.remaining = input.remaining;
  if (input.last_contact_date !== undefined) patch.last_contact_date = input.last_contact_date;
  if (input.additional_notes !== undefined) patch.additional_notes = input.additional_notes;
  if (input.feedback !== undefined) patch.feedback = input.feedback;
  if (input.assigned_employee !== undefined) patch.assigned_employee = input.assigned_employee;
  if (input.custom_fields !== undefined) patch.custom_fields = input.custom_fields;

  const { data, error } = await admin
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as UnitRow | null) ?? null;
}

export async function deleteUnit(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}
