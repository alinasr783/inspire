"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { success: true } | { success: false; error: string };
export type VisitStatus = "upcoming" | "completed" | "cancelled";

async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

async function getProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, role, first_name, second_name")
    .eq("id", user.id)
    .single();
  return data;
}

async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

export type VisitRow = {
  id: string;
  client_id: string;
  unit_id: string;
  compound_name: string;
  building_number: string;
  apartment_number: string;
  visit_date: string;
  status: VisitStatus;
  notes: string;
  post_visit_notes: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export type VisitWithRelations = VisitRow & {
  client: {
    id: string;
    customer_name: string;
    phone: string;
  } | null;
  unit: {
    id: string;
    customer_name: string;
    phone: string;
    compound_name: string;
    building_number: string;
    unit_type: string;
  } | null;
  creator: {
    id: string;
    first_name: string;
    second_name: string;
  } | null;
  assignee: {
    id: string;
    first_name: string;
    second_name: string;
  } | null;
};

export async function createVisit(data: {
  client_id: string;
  unit_id: string;
  compound_name: string;
  building_number: string;
  apartment_number: string;
  visit_date: string;
  notes?: string;
  assigned_to?: string;
  is_external_client?: boolean;
  client_broker_phone?: string;
  is_external_property?: boolean;
  property_broker_phone?: string;
}): Promise<ActionResult & { id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const extClient = data.is_external_client ?? false;
  const extProp = data.is_external_property ?? false;

  const admin = createAdminClient();
  const insertData: Record<string, unknown> = {
    client_id: extClient ? null : data.client_id || null,
    unit_id: extProp ? null : data.unit_id || null,
    compound_name: data.compound_name,
    building_number: data.building_number,
    apartment_number: data.apartment_number,
    visit_date: data.visit_date,
    notes: data.notes ?? "",
    created_by: user.id,
    status: "upcoming",
    is_external_client: extClient,
    client_broker_phone: extClient ? (data.client_broker_phone ?? "") : "",
    is_external_property: extProp,
    property_broker_phone: extProp ? (data.property_broker_phone ?? "") : "",
  };

  if (data.assigned_to) {
    insertData.assigned_to = data.assigned_to;
  }

  const { data: created, error } = await admin
    .from("visits")
    .insert(insertData)
    .select("id")
    .single();

  if (error) return { success: false, error: "create-failed" };
  revalidatePath("/", "layout");
  return { success: true, id: created.id };
}

export async function updateVisit(
  visitId: string,
  data: {
    client_id?: string;
    unit_id?: string;
    compound_name?: string;
    building_number?: string;
    apartment_number?: string;
    visit_date?: string;
    status?: VisitStatus;
    notes?: string;
    post_visit_notes?: string;
    assigned_to?: string | null;
  }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const userAdmin = await isAdmin();

  if (!userAdmin) {
    const { data: visit } = await admin
      .from("visits")
      .select("created_by")
      .eq("id", visitId)
      .single();
    if (!visit || visit.created_by !== user.id) {
      return { success: false, error: "unauthorized" };
    }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (data.client_id !== undefined) updateData.client_id = data.client_id;
  if (data.unit_id !== undefined) updateData.unit_id = data.unit_id;
  if (data.compound_name !== undefined) updateData.compound_name = data.compound_name;
  if (data.building_number !== undefined) updateData.building_number = data.building_number;
  if (data.apartment_number !== undefined) updateData.apartment_number = data.apartment_number;
  if (data.visit_date !== undefined) updateData.visit_date = data.visit_date;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.post_visit_notes !== undefined) updateData.post_visit_notes = data.post_visit_notes;
  if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to;

  const { error } = await admin
    .from("visits")
    .update(updateData)
    .eq("id", visitId);

  if (error) return { success: false, error: "update-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateVisitField(
  visitId: string,
  field: string,
  value: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const userAdmin = await isAdmin();

  if (!userAdmin) {
    const { data: visit } = await admin
      .from("visits")
      .select("created_by")
      .eq("id", visitId)
      .single();
    if (!visit || visit.created_by !== user.id) {
      return { success: false, error: "unauthorized" };
    }
  }

  const updateData: Record<string, unknown> = {
    [field]: value,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("visits").update(updateData).eq("id", visitId);
  if (error) return { success: false, error: "update-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteVisit(visitId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const userAdmin = await isAdmin();

  if (!userAdmin) {
    const { data: visit } = await admin
      .from("visits")
      .select("created_by")
      .eq("id", visitId)
      .single();
    if (!visit || visit.created_by !== user.id) {
      return { success: false, error: "unauthorized" };
    }
  }

  const { error } = await admin.from("visits").delete().eq("id", visitId);
  if (error) return { success: false, error: "delete-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function fetchVisits(): Promise<VisitWithRelations[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const admin = createAdminClient();
  const userAdmin = await isAdmin();

  let query = admin
    .from("visits")
    .select(`
      *,
      client:clients!inner(id, customer_name, phone),
      unit:units!inner(id, customer_name, phone, compound_name, building_number, unit_type),
      creator:profiles!visits_created_by_fkey(id, first_name, second_name),
      assignee:assigned_to(id, first_name, second_name)
    `);

  if (!userAdmin) {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query.order("visit_date", { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as VisitWithRelations[];
}

export async function fetchVisit(visitId: string): Promise<VisitWithRelations | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const admin = createAdminClient();
  const userAdmin = await isAdmin();

  let query = admin
    .from("visits")
    .select(`
      *,
      client:clients!inner(id, customer_name, phone),
      unit:units!inner(id, customer_name, phone, compound_name, building_number, unit_type),
      creator:profiles!visits_created_by_fkey(id, first_name, second_name),
      assignee:assigned_to(id, first_name, second_name)
    `)
    .eq("id", visitId);

  if (!userAdmin) {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query.single();

  if (error || !data) return null;
  return data as unknown as VisitWithRelations;
}

export async function fetchMyClients() {
  const user = await getCurrentUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("id, customer_name, phone")
    .or(`assigned_employee.eq.${user.id},created_by.eq.${user.id}`)
    .order("customer_name", { ascending: true });

  return (data ?? []) as { id: string; customer_name: string; phone: string }[];
}

export async function fetchAllUnits() {
  const user = await getCurrentUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("units")
    .select("id, customer_name, phone, compound_name, building_number, unit_type")
    .order("customer_name", { ascending: true });

  return (data ?? []) as {
    id: string;
    customer_name: string;
    phone: string;
    compound_name: string;
    building_number: string;
    unit_type: string;
  }[];
}

export async function fetchEmployees() {
  const user = await getCurrentUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, first_name, second_name")
    .eq("approval_status", "approved")
    .order("first_name", { ascending: true });

  return (data ?? []) as { id: string; first_name: string; second_name: string }[];
}
