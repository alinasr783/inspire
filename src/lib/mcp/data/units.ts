import { createAdminClient } from "@/lib/supabase/admin";
import type { UnitRow } from "@/lib/unit-actions";
import { getDefaultUserId } from "@/lib/mcp/utils";
import type {
  CreateUnitInput,
  SearchUnitsParams,
  UpdateUnitPayload,
} from "@/lib/mcp/schemas";

const TABLE = "units";

export async function searchUnits(params: SearchUnitsParams): Promise<UnitRow[]> {
  const admin = createAdminClient();
  let query = admin.from(TABLE).select("*");

  if (params.customer_name) query = query.ilike("customer_name", `%${params.customer_name}%`);
  if (params.phone) query = query.ilike("phone", `%${params.phone}%`);
  if (params.compound_name) query = query.ilike("compound_name", `%${params.compound_name}%`);
  if (params.area) query = query.ilike("area", `%${params.area}%`);
  if (params.building_number) query = query.ilike("building_number", `%${params.building_number}%`);
  if (params.finishing_status) query = query.eq("finishing_status", params.finishing_status);
  if (params.rent_sale) query = query.eq("rent_sale", params.rent_sale);
  if (params.unit_type) query = query.eq("unit_type", params.unit_type);
  if (params.assigned_employee) query = query.eq("assigned_employee", params.assigned_employee);
  if (params.cash_required_min != null) query = query.gte("cash_required", params.cash_required_min);
  if (params.cash_required_max != null) query = query.lte("cash_required", params.cash_required_max);
  if (params.remaining_min != null) query = query.gte("remaining", params.remaining_min);
  if (params.remaining_max != null) query = query.lte("remaining", params.remaining_max);

  query = query.order("created_at", { ascending: false });

  const offset = params.offset ?? 0;
  const limit = params.limit ?? 50;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as UnitRow[];
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
