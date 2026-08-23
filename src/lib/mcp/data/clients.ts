import { createAdminClient } from "@/lib/supabase/admin";
import type { ClientRow } from "@/lib/client-actions";
import { getDefaultUserId } from "@/lib/mcp/utils";
import type {
  CreateClientInput,
  SearchClientsParams,
  UpdateClientPayload,
} from "@/lib/mcp/schemas";

const TABLE = "clients";

export type SearchClientsResult = {
  rows: ClientRow[];
  total: number;
};

function sanitizeLike(value: string): string {
  return value.replace(/[,().%_]/g, " ").trim();
}

type Admin = ReturnType<typeof createAdminClient>;
type FilterQuery = ReturnType<ReturnType<Admin["from"]>["select"]>;

function applyFilters(query: FilterQuery, params: SearchClientsParams): FilterQuery {
  let q = query;

  q = q.eq("is_company_client", params.is_company_client ?? false);

  if (params.query) {
    const search = sanitizeLike(params.query);
    if (search) {
      const orFilter = ["customer_name", "phone", "phone_alt", "additional_notes"]
        .map((col) => `${col}.ilike.%${search}%`)
        .join(",");
      q = q.or(orFilter);
    }
  }
  if (params.customer_name) q = q.ilike("customer_name", `%${params.customer_name}%`);
  if (params.phone) q = q.ilike("phone", `%${params.phone}%`);
  if (params.phone_alt) q = q.ilike("phone_alt", `%${params.phone_alt}%`);
  if (params.payment_method) q = q.eq("payment_method", params.payment_method);
  if (params.preferred_area) q = q.ilike("preferred_area", `%${params.preferred_area}%`);
  if (params.unit_type) q = q.eq("unit_type", params.unit_type);
  if (params.bedrooms) q = q.eq("bedrooms", params.bedrooms);
  if (params.preferred_developer) q = q.ilike("preferred_developer", `%${params.preferred_developer}%`);
  if (params.source) q = q.eq("source", params.source);
  if (params.assigned_employee) q = q.eq("assigned_employee", params.assigned_employee);
  if (params.created_by) q = q.eq("created_by", params.created_by);
  if (params.budget_min != null) q = q.gte("budget_from", params.budget_min);
  if (params.budget_max != null) q = q.lte("budget_from", params.budget_max);
  if (params.last_contact_from) q = q.gte("last_contact_date", params.last_contact_from);
  if (params.last_contact_to) q = q.lte("last_contact_date", params.last_contact_to);
  if (params.seriousness_min != null) q = q.gte("seriousness_rating", params.seriousness_min);
  if (params.seriousness_max != null) q = q.lte("seriousness_rating", params.seriousness_max);

  if (params.custom_fields) {
    for (const [key, value] of Object.entries(params.custom_fields)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");
      const v = sanitizeLike(value);
      if (v) q = q.ilike(`custom_fields->>${safeKey}`, `%${v}%`);
    }
  }

  return q;
}

export async function searchClients(params: SearchClientsParams): Promise<SearchClientsResult> {
  const admin = createAdminClient();

  const countBase = admin
    .from(TABLE)
    .select("id", { count: "exact", head: true }) as unknown as FilterQuery;
  const countRes = await applyFilters(countBase, params);
  const total = (countRes as unknown as { count: number | null }).count ?? 0;

  const dataQuery = applyFilters(admin.from(TABLE).select("*"), params);
  const orderCol = params.sort_by ?? "created_at";
  dataQuery.order(orderCol, { ascending: (params.sort_order ?? "desc") === "asc" });

  const offset = params.offset ?? 0;
  const limit = params.limit ?? 50;
  dataQuery.range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw new Error(error.message);

  return {
    rows: (data ?? []) as ClientRow[],
    total,
  };
}

export async function getClientById(id: string): Promise<ClientRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ClientRow | null) ?? null;
}

export async function createClient(input: CreateClientInput): Promise<ClientRow> {
  const admin = createAdminClient();
  const created_by = getDefaultUserId();

  const { data, error } = await admin
    .from(TABLE)
    .insert({
      customer_name: input.customer_name,
      phone: input.phone,
      phone_alt: input.phone_alt ?? null,
      budget_from: input.budget_from ?? null,
      budget_to: input.budget_to ?? null,
      payment_method: input.payment_method ?? null,
      preferred_area: input.preferred_area ?? null,
      unit_type: input.unit_type ?? null,
      bedrooms: input.bedrooms ?? null,
      preferred_developer: input.preferred_developer ?? null,
      source: input.source ?? null,
      additional_notes: input.additional_notes ?? null,
      last_contact_date: input.last_contact_date ?? null,
      assigned_employee: input.assigned_employee ?? null,
      seriousness_rating: input.seriousness_rating ?? 5,
      custom_fields: input.custom_fields ?? {},
      is_company_client: false,
      created_by,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as ClientRow;
}

export async function updateClient(id: string, input: UpdateClientPayload): Promise<ClientRow | null> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.customer_name !== undefined) patch.customer_name = input.customer_name;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.phone_alt !== undefined) patch.phone_alt = input.phone_alt;
  if (input.budget_from !== undefined) patch.budget_from = input.budget_from;
  if (input.budget_to !== undefined) patch.budget_to = input.budget_to;
  if (input.payment_method !== undefined) patch.payment_method = input.payment_method;
  if (input.preferred_area !== undefined) patch.preferred_area = input.preferred_area;
  if (input.unit_type !== undefined) patch.unit_type = input.unit_type;
  if (input.bedrooms !== undefined) patch.bedrooms = input.bedrooms;
  if (input.preferred_developer !== undefined) patch.preferred_developer = input.preferred_developer;
  if (input.source !== undefined) patch.source = input.source;
  if (input.additional_notes !== undefined) patch.additional_notes = input.additional_notes;
  if (input.last_contact_date !== undefined) patch.last_contact_date = input.last_contact_date;
  if (input.assigned_employee !== undefined) patch.assigned_employee = input.assigned_employee;
  if (input.seriousness_rating !== undefined) patch.seriousness_rating = input.seriousness_rating;
  if (input.custom_fields !== undefined) patch.custom_fields = input.custom_fields;

  const { data, error } = await admin
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ClientRow | null) ?? null;
}

export async function deleteClient(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}
