"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UnitRow } from "@/lib/unit-actions";
import type { ClientRow } from "@/lib/client-actions";
import type { DealRow } from "@/lib/deal-actions";
import type { TaskRow, EmployeeRow } from "@/lib/task-types";
import type { DeviceRow } from "@/lib/device-actions";

export async function queryUnits(): Promise<UnitRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as UnitRow[];
}

export async function queryClients(): Promise<ClientRow[]> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  let query = admin.from("clients").select("*").order("created_at", { ascending: false });
  if (!isAdmin) query = query.eq("created_by", user.id);
  const { data } = await query;
  return (data ?? []) as ClientRow[];
}

export async function queryDeals(): Promise<DealRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("generated_deals")
    .select(`
      *,
      client:clients!inner(id, customer_name, phone, unit_type, budget_from, budget_to, preferred_area, bedrooms),
      unit:units!inner(id, customer_name, phone, area, building_number, compound_name, finishing_status, rent_sale, unit_type, cash_required, remaining)
    `)
    .order("final_score", { ascending: false });
  return (data ?? []) as unknown as DealRow[];
}

export async function queryTasks(): Promise<{ tasks: TaskRow[]; employees: EmployeeRow[] }> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { tasks: [], employees: [] };

  const { data: me } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = me?.role === "admin";

  const [tasksRes, profilesRes] = await Promise.all([
    isAdmin
      ? admin.from("tasks").select("*").order("due_date", { ascending: true })
      : admin.from("tasks").select("*").eq("assigned_to", user.id).order("due_date", { ascending: true }),
    admin
      .from("profiles")
      .select("id, first_name, second_name, position, avatar_url")
      .eq("approval_status", "approved")
      .order("first_name", { ascending: true }),
  ]);

  return {
    tasks: (tasksRes.data ?? []) as unknown as TaskRow[],
    employees: (profilesRes.data ?? []) as EmployeeRow[],
  };
}

export async function queryDevices(): Promise<DeviceRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_devices")
    .select("id, fingerprint, label, user_agent, last_seen_at, created_at")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false });
  return (data ?? []) as DeviceRow[];
}

export async function queryEmployees(): Promise<EmployeeRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, first_name, second_name, position, avatar_url")
    .eq("approval_status", "approved")
    .order("first_name", { ascending: true });
  return (data ?? []) as EmployeeRow[];
}
