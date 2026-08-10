"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export type TeamMemberRow = {
  id: string;
  first_name: string | null;
  second_name: string | null;
  email: string;
  phone: string | null;
  position: string | null;
  avatar_url: string | null;
  role: string;
  approval_status: string;
  clients_count: number;
  properties_count: number;
  visits_count: number;
  tasks_pending: number;
};

export type TeamMemberProfile = TeamMemberRow & {
  attendance_rate: number;
  tasks_done: number;
  tasks_in_progress: number;
  tasks_todo: number;
  tasks_overdue: number;
  deals_count: number;
  total_commission: number;
  total_company_profit: number;
  total_hours: number;
};

export type MemberClient = {
  id: string;
  customer_name: string;
  phone: string;
  budget_from: number | null;
  budget_to: number | null;
  preferred_area: string | null;
  seriousness_rating: number | null;
  created_at: string;
};

export type MemberProperty = {
  id: string;
  customer_name: string;
  phone: string;
  compound_name: string | null;
  area: string | null;
  unit_type: string | null;
  rent_sale: string | null;
  cash_required: number | null;
  created_at: string;
};

export type MemberVisit = {
  id: string;
  client_name: string;
  compound_name: string;
  building_number: string;
  visit_date: string;
  status: string;
};

export type MemberTask = {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  target: number | null;
  status: string;
  due_date: string;
};

export type MemberAttendance = {
  id: string;
  check_in_date: string;
  check_in_time: string;
  location_name: string | null;
  notes: string | null;
};

export type MemberWorkLog = {
  id: string;
  log_date: string;
  title: string;
  description: string | null;
  hours: number;
  category: string;
  status: string;
};

export type MemberDeal = {
  id: string;
  buyer_name: string;
  seller_name: string;
  building_number: string;
  apartment_number: string;
  compound_name: string;
  final_commission: number;
  company_net_profit: number;
  employee_profit: number;
  employee_percentage: number;
  company_percentage: number;
  contact_type: string;
  has_employee: boolean;
  expenses: number;
  nathryat: number;
  created_at: string;
};

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

const updateEmployeeSchema = z.object({
  first_name: z.string().trim().min(1, "required").optional(),
  second_name: z.string().trim().optional(),
  position: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  role: z.enum(["user", "admin"]).optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("unauthorized");
  return user.id;
}

export async function getTeamMembers(): Promise<TeamMemberRow[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("*")
    .eq("approval_status", "approved")
    .order("first_name", { ascending: true });

  if (!profiles) return [];

  const employeeIds = profiles.map((p) => p.id);

  const [{ count: clientsCount, data: clients }, { data: propertiesCreated }, { data: propertiesAssigned }, { count: visitsCount, data: visits }, { data: tasks }] =
    await Promise.all([
      admin.from("clients").select("id, created_by", { count: "exact" }).in("created_by", employeeIds),
      admin.from("units").select("id, created_by").in("created_by", employeeIds),
      admin.from("units").select("id, assigned_employee").in("assigned_employee", employeeIds),
      admin.from("visits").select("id, assigned_to", { count: "exact" }).in("assigned_to", employeeIds),
      admin.from("tasks").select("id, assigned_to, status").in("assigned_to", employeeIds),
    ]);

  const clientMap = new Map<string, number>();
  const propertyMap = new Map<string, number>();
  const visitMap = new Map<string, number>();
  const pendingTaskMap = new Map<string, number>();

  for (const c of clients ?? []) {
    clientMap.set(c.created_by, (clientMap.get(c.created_by) ?? 0) + 1);
  }
  for (const p of propertiesCreated ?? []) {
    propertyMap.set(p.created_by, (propertyMap.get(p.created_by) ?? 0) + 1);
  }
  for (const p of propertiesAssigned ?? []) {
    if (p.assigned_employee) {
      propertyMap.set(p.assigned_employee, (propertyMap.get(p.assigned_employee) ?? 0) + 1);
    }
  }
  for (const v of visits ?? []) {
    if (v.assigned_to) visitMap.set(v.assigned_to, (visitMap.get(v.assigned_to) ?? 0) + 1);
  }
  for (const t of tasks ?? []) {
    if (t.status !== "done") {
      pendingTaskMap.set(t.assigned_to, (pendingTaskMap.get(t.assigned_to) ?? 0) + 1);
    }
  }

  return profiles.map((p) => ({
    id: p.id,
    first_name: p.first_name,
    second_name: p.second_name,
    email: p.email,
    phone: p.phone,
    position: p.position,
    avatar_url: p.avatar_url,
    role: p.role,
    approval_status: p.approval_status,
    clients_count: clientMap.get(p.id) ?? 0,
    properties_count: propertyMap.get(p.id) ?? 0,
    visits_count: visitMap.get(p.id) ?? 0,
    tasks_pending: pendingTaskMap.get(p.id) ?? 0,
  }));
}

export async function getEmployeeFullProfile(
  employeeId: string
): Promise<TeamMemberProfile | null> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", employeeId)
    .single();

  if (!profile) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: clientsCount },
    { count: propertiesCreatedCount },
    { count: propertiesAssignedCount },
    { count: visitsCount },
    { data: tasks },
    { count: attendanceTotal, data: monthAttendance },
    { data: workLogs },
    { data: dealEmployees },
  ] = await Promise.all([
    admin.from("clients").select("id", { count: "exact", head: true }).eq("created_by", employeeId),
    admin.from("units").select("id", { count: "exact", head: true }).eq("created_by", employeeId),
    admin.from("units").select("id", { count: "exact", head: true }).eq("assigned_employee", employeeId),
    admin.from("visits").select("id", { count: "exact", head: true }).eq("assigned_to", employeeId),
    admin.from("tasks").select("*").eq("assigned_to", employeeId),
    admin.from("attendance_records").select("id, check_in_date", { count: "exact" }).eq("employee_id", employeeId),
    admin.from("daily_work_logs").select("hours").eq("employee_id", employeeId),
    admin.from("deal_employees").select("deal_id, profit_amount").eq("employee_id", employeeId),
  ]);

  const monthAttendanceCount = (monthAttendance ?? []).filter((a) =>
    a.check_in_date >= startOfMonth
  ).length;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const workDays = Math.max(1, Math.floor(daysInMonth * 5 / 7));
  const attendanceRate = Math.round((monthAttendanceCount / workDays) * 100);

  let tasksTodo = 0, tasksInProgress = 0, tasksDone = 0, tasksOverdue = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const t of tasks ?? []) {
    if (t.status === "todo") tasksTodo++;
    else if (t.status === "in_progress") tasksInProgress++;
    else if (t.status === "done") tasksDone++;

    const due = new Date(t.due_date);
    due.setHours(0, 0, 0, 0);
    if (t.status !== "done" && due.getTime() < today.getTime()) tasksOverdue++;
  }

  const totalHours = (workLogs ?? []).reduce((sum, w) => sum + (w.hours ?? 0), 0);

  const dealIds = [...new Set((dealEmployees ?? []).map((d) => d.deal_id))];
  let totalCommission = 0;
  let totalCompanyProfit = 0;

  if (dealIds.length > 0) {
    const { data: deals } = await admin
      .from("deals")
      .select("id, company_net_profit")
      .in("id", dealIds);

    for (const d of deals ?? []) {
      totalCompanyProfit += d.company_net_profit ?? 0;
    }
  }

  for (const de of dealEmployees ?? []) {
    totalCommission += de.profit_amount ?? 0;
  }

  return {
    id: profile.id,
    first_name: profile.first_name,
    second_name: profile.second_name,
    email: profile.email,
    phone: profile.phone,
    position: profile.position,
    avatar_url: profile.avatar_url,
    role: profile.role,
    approval_status: profile.approval_status,
    clients_count: clientsCount ?? 0,
    properties_count: (propertiesCreatedCount ?? 0) + (propertiesAssignedCount ?? 0),
    visits_count: visitsCount ?? 0,
    tasks_pending: tasksTodo + tasksInProgress,
    attendance_rate: Math.min(100, attendanceRate),
    tasks_done: tasksDone,
    tasks_in_progress: tasksInProgress,
    tasks_todo: tasksTodo,
    tasks_overdue: tasksOverdue,
    deals_count: dealIds.length,
    total_commission: Math.round(totalCommission * 100) / 100,
    total_company_profit: Math.round(totalCompanyProfit * 100) / 100,
    total_hours: Math.round(totalHours * 10) / 10,
  };
}

export async function getEmployeeClients(
  employeeId: string
): Promise<MemberClient[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data } = await admin
    .from("clients")
    .select("*")
    .eq("created_by", employeeId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((c) => ({
    id: c.id,
    customer_name: c.customer_name,
    phone: c.phone,
    budget_from: c.budget_from,
    budget_to: c.budget_to,
    preferred_area: c.preferred_area,
    seriousness_rating: c.seriousness_rating,
    created_at: c.created_at,
  }));
}

export async function getEmployeeProperties(
  employeeId: string
): Promise<MemberProperty[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: created }, { data: assigned }] = await Promise.all([
    admin.from("units").select("*").eq("created_by", employeeId),
    admin.from("units").select("*").eq("assigned_employee", employeeId),
  ]);

  const seen = new Set<string>();
  const all: MemberProperty[] = [];

  for (const u of [...(created ?? []), ...(assigned ?? [])]) {
    if (seen.has(u.id)) continue;
    seen.add(u.id);
    all.push({
      id: u.id,
      customer_name: u.customer_name,
      phone: u.phone,
      compound_name: u.compound_name,
      area: u.area,
      unit_type: u.unit_type,
      rent_sale: u.rent_sale,
      cash_required: u.cash_required,
      created_at: u.created_at,
    });
  }

  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return all;
}

export async function getEmployeeVisits(
  employeeId: string
): Promise<MemberVisit[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data } = await admin
    .from("visits")
    .select(`
      id, compound_name, building_number, visit_date, status,
      client:clients!visits_client_id_fkey(customer_name)
    `)
    .eq("assigned_to", employeeId)
    .order("visit_date", { ascending: false });

  return (data ?? []).map((v: Record<string, unknown>) => ({
    id: v.id as string,
    client_name: (v.client as Record<string, unknown> | null)?.customer_name as string ?? "",
    compound_name: v.compound_name as string,
    building_number: v.building_number as string,
    visit_date: v.visit_date as string,
    status: v.status as string,
  }));
}

export async function getEmployeeTasks(
  employeeId: string
): Promise<MemberTask[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data } = await admin
    .from("tasks")
    .select("*")
    .eq("assigned_to", employeeId)
    .order("created_at", { ascending: false });

  return (data ?? []) as MemberTask[];
}

export async function getEmployeeAttendance(
  employeeId: string,
  year?: number,
  month?: number
): Promise<MemberAttendance[]> {
  await requireAdmin();
  const admin = createAdminClient();

  let query = admin
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employeeId);

  if (year && month) {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
    query = query.gte("check_in_date", startDate).lte("check_in_date", endDate);
  }

  const { data } = await query.order("check_in_date", { ascending: false });

  return (data ?? []).map((a) => ({
    id: a.id,
    check_in_date: a.check_in_date,
    check_in_time: a.check_in_time,
    location_name: a.location_name,
    notes: a.notes,
  }));
}

export async function getEmployeeWorkLogs(
  employeeId: string,
  year?: number,
  month?: number
): Promise<MemberWorkLog[]> {
  await requireAdmin();
  const admin = createAdminClient();

  let query = admin
    .from("daily_work_logs")
    .select("*")
    .eq("employee_id", employeeId);

  if (year && month) {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
    query = query.gte("log_date", startDate).lte("log_date", endDate);
  }

  const { data } = await query.order("log_date", { ascending: false });

  return (data ?? []).map((w) => ({
    id: w.id,
    log_date: w.log_date,
    title: w.title,
    description: w.description,
    hours: w.hours,
    category: w.category,
    status: w.status,
  }));
}

export async function getEmployeeDeals(
  employeeId: string
): Promise<MemberDeal[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: dealEmployees } = await admin
    .from("deal_employees")
    .select("deal_id, profit_amount, percentage")
    .eq("employee_id", employeeId);

  type DealEmp = { deal_id: string; profit_amount: number; percentage: number };
  const empMap = new Map<string, DealEmp>();
  for (const de of (dealEmployees ?? []) as DealEmp[]) {
    empMap.set(de.deal_id, de);
  }

  const dealIds = [...empMap.keys()];

  if (dealIds.length === 0) return [];

  const { data: deals } = await admin
    .from("deals")
    .select("*")
    .in("id", dealIds)
    .order("created_at", { ascending: false });

  return (deals ?? []).map((d) => {
    const emp = empMap.get(d.id);
    return {
      id: d.id,
      buyer_name: d.buyer_name ?? "",
      seller_name: d.seller_name ?? "",
      building_number: d.building_number ?? "",
      apartment_number: d.apartment_number ?? "",
      compound_name: d.compound_name ?? "",
      final_commission: d.final_commission ?? 0,
      company_net_profit: d.company_net_profit ?? 0,
      employee_profit: emp?.profit_amount ?? 0,
      employee_percentage: emp?.percentage ?? 0,
      company_percentage: d.company_percentage ?? 0,
      contact_type: d.contact_type ?? "",
      has_employee: d.has_employee ?? false,
      expenses: d.expenses ?? 0,
      nathryat: d.nathryat ?? 0,
      created_at: d.created_at,
    };
  });
}

export async function updateEmployee(
  employeeId: string,
  data: z.infer<typeof updateEmployeeSchema>
): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const parsed = updateEmployeeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "invalid_data" };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.first_name !== undefined) updates.first_name = parsed.data.first_name;
  if (parsed.data.second_name !== undefined) updates.second_name = parsed.data.second_name;
  if (parsed.data.position !== undefined) updates.position = parsed.data.position;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "no_changes" };
  }

  const { error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", employeeId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function disableEmployee(
  employeeId: string
): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ approval_status: "rejected" })
    .eq("id", employeeId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function enableEmployee(
  employeeId: string
): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ approval_status: "approved" })
    .eq("id", employeeId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function deleteEmployee(
  employeeId: string
): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();

  await Promise.all([
    admin.from("units").update({ created_by: null, assigned_employee: null }).eq("created_by", employeeId),
    admin.from("clients").update({ created_by: null, assigned_employee: null }).eq("created_by", employeeId),
    admin.from("visits").update({ assigned_to: null }).eq("assigned_to", employeeId),
    admin.from("tasks").update({ assigned_to: null }).eq("assigned_to", employeeId),
    admin.from("deals").update({ created_by: null }).eq("created_by", employeeId),
    admin.from("deal_employees").delete().eq("employee_id", employeeId),
    admin.from("attendance_records").delete().eq("employee_id", employeeId),
    admin.from("daily_work_logs").delete().eq("employee_id", employeeId),
  ]);

  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", employeeId);

  if (profileError) return { success: false, error: profileError.message };

  const { error: authError } = await admin.auth.admin.deleteUser(employeeId);

  if (authError) return { success: false, error: authError.message };

  revalidatePath("/");
  return { success: true };
}
