"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UnitRow } from "@/lib/unit-actions";
import type { ClientRow } from "@/lib/client-actions";
import type { DealRow } from "@/lib/deal-actions";
import type { TaskRow, EmployeeRow } from "@/lib/task-types";
import type { DeviceRow } from "@/lib/device-actions";
import type { DealRow as FinanceDealRow } from "@/lib/finance-types";
import type { TimeFilter } from "@/lib/finance-types";
import { getTimeFilterDate } from "@/lib/finance-types";

import type { DailyWorkLogWithEmployee } from "@/lib/daily-work-log-types";

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

export async function queryDailyWorkLogs(
  year: number,
  month: number,
  employeeFilter?: string
): Promise<DailyWorkLogWithEmployee[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  let query = admin
    .from("daily_work_logs")
    .select(`
      *,
      employee:profiles!daily_work_logs_employee_id_fkey(id, first_name, second_name, position, avatar_url)
    `)
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (isAdmin && employeeFilter) {
    query = query.eq("employee_id", employeeFilter);
  } else if (!isAdmin) {
    query = query.eq("employee_id", user.id);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as DailyWorkLogWithEmployee[];
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

export async function queryFinances(timeFilter: TimeFilter = "all"): Promise<FinanceDealRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!me || me.role !== "admin") return [];

  const sinceDate = getTimeFilterDate(timeFilter);

  let query = admin
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false });

  if (sinceDate) {
    query = query.gte("created_at", sinceDate.toISOString());
  }

  const { data } = await query;
  return (data ?? []) as FinanceDealRow[];
}
