"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { success: true } | { success: false; error: string };
export type ActionResultWithId = ActionResult & { id?: string };

async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin";
}

export type ContractTemplate = {
  id: string;
  name: string;
  content: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type ContractInstance = {
  id: string;
  template_id: string;
  filled_data: Record<string, unknown>;
  created_by: string;
  created_at: string;
  related_client_id: string | null;
  related_unit_id: string | null;
  related_deal_id: string | null;
  template?: {
    id: string;
    name: string;
    content: Record<string, unknown>;
  };
  client?: {
    id: string;
    customer_name: string;
  } | null;
  unit?: {
    id: string;
    customer_name: string;
  } | null;
};

export async function createTemplate(data: {
  name: string;
  content: Record<string, unknown>;
}): Promise<ActionResultWithId> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin_ok = await isAdmin();
  if (!admin_ok) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("contract_templates")
    .insert({
      name: data.name,
      content: data.content,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: "create_failed" };
  revalidatePath("/contracts");
  return { success: true, id: created.id };
}

export async function updateTemplate(
  templateId: string,
  data: {
    name?: string;
    content?: Record<string, unknown>;
    is_active?: boolean;
  }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin_ok = await isAdmin();
  if (!admin_ok) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const { error } = await admin
    .from("contract_templates")
    .update(updateData)
    .eq("id", templateId);

  if (error) return { success: false, error: "update_failed" };
  revalidatePath("/contracts");
  return { success: true };
}

export async function deleteTemplate(templateId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin_ok = await isAdmin();
  if (!admin_ok) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("contract_templates")
    .delete()
    .eq("id", templateId);

  if (error) return { success: false, error: "delete_failed" };
  revalidatePath("/contracts");
  return { success: true };
}

export async function fetchTemplates(): Promise<ContractTemplate[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contract_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as ContractTemplate[];
}

export async function fetchTemplate(
  templateId: string
): Promise<ContractTemplate | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contract_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (error || !data) return null;
  console.log("[fetchTemplate] DB content:", JSON.stringify(data.content).substring(0, 300));
  return data as unknown as ContractTemplate;
}

export async function createInstance(data: {
  template_id: string;
  filled_data: Record<string, unknown>;
  related_client_id?: string;
  related_unit_id?: string;
  related_deal_id?: string;
}): Promise<ActionResultWithId> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("contract_instances")
    .insert({
      template_id: data.template_id,
      filled_data: data.filled_data,
      created_by: user.id,
      related_client_id: data.related_client_id || null,
      related_unit_id: data.related_unit_id || null,
      related_deal_id: data.related_deal_id || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: "create_instance_failed" };
  revalidatePath("/contracts");
  return { success: true, id: created.id };
}

export async function fetchInstances(): Promise<ContractInstance[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const admin = createAdminClient();
  const userAdmin = await isAdmin();

  let query = admin
    .from("contract_instances")
    .select(`
      *,
      template:contract_templates(id, name, content),
      client:clients(id, customer_name),
      unit:units(id, customer_name)
    `)
    .order("created_at", { ascending: false });

  if (!userAdmin) {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as unknown as ContractInstance[];
}

export async function fetchInstance(
  instanceId: string
): Promise<ContractInstance | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const admin = createAdminClient();
  const userAdmin = await isAdmin();

  let query = admin
    .from("contract_instances")
    .select(`
      *,
      template:contract_templates(id, name, content),
      client:clients(id, customer_name),
      unit:units(id, customer_name)
    `)
    .eq("id", instanceId);

  if (!userAdmin) {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query.single();

  if (error || !data) return null;
  return data as unknown as ContractInstance;
}

export async function deleteInstance(instanceId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const userAdmin = await isAdmin();

  if (!userAdmin) {
    const { data: instance } = await admin
      .from("contract_instances")
      .select("created_by")
      .eq("id", instanceId)
      .single();
    if (!instance || instance.created_by !== user.id) {
      return { success: false, error: "unauthorized" };
    }
  }

  const { error } = await admin
    .from("contract_instances")
    .delete()
    .eq("id", instanceId);

  if (error) return { success: false, error: "delete_instance_failed" };
  revalidatePath("/contracts");
  return { success: true };
}

export async function fetchClientsForContract() {
  const user = await getCurrentUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("id, customer_name, phone")
    .order("customer_name", { ascending: true });

  return (data ?? []) as { id: string; customer_name: string; phone: string }[];
}

export async function fetchUnitsForContract() {
  const user = await getCurrentUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("units")
    .select("id, customer_name, compound_name")
    .order("customer_name", { ascending: true });

  return (
    data ?? []
  ) as { id: string; customer_name: string; compound_name: string }[];
}
