"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type MonthlyData = { month: string; count: number }[];

export type CategoryData = { name: string; value: number; color: string }[];

export type ReportData = {
  unitsByMonth: MonthlyData;
  clientsByMonth: MonthlyData;
  unitsByType: CategoryData;
  unitsByFinishing: CategoryData;
  unitsByRentSale: CategoryData;
  clientsByUnitType: CategoryData;
  clientsBySource: CategoryData;
  tasksByStatus: CategoryData;
  totalUnits: number;
  totalClients: number;
  totalTasks: number;
  totalDeals: number;
  totalCashRequired: number;
  totalRemaining: number;
  approvedDeals: number;
  rejectedDeals: number;
  pendingDeals: number;
  topCompounds: { name: string; count: number }[];
  tasksOverdue: number;
  tasksCompleted: number;
  tasksActive: number;
};

const CHART_COLORS = [
  "#06c167", "#276ef1", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

function monthLabels(count: number, endDate: Date): string[] {
  const months: string[] = [];
  const d = new Date(endDate);
  for (let i = count - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function fillMonthly(rows: { created_at: string }[], count: number, endDate: Date): MonthlyData {
  const labels = monthLabels(count, endDate);
  const counts = new Map<string, number>();
  labels.forEach((l) => counts.set(l, 0));

  for (const row of rows) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return labels.map((l) => ({ month: l, count: counts.get(l) ?? 0 }));
}

function toCategory(rows: Record<string, unknown>[], key: string, limit = 10): CategoryData {
  const map = new Map<string, number>();
  for (const row of rows) {
    const val = String(row[key] ?? "").trim();
    if (val) map.set(val, (map.get(val) ?? 0) + 1);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  return sorted.map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
}

export async function fetchReports(rangeMonths: number = 12): Promise<ReportData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();

  const { data: me } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = me?.role === "admin";
  const userId = user.id;

  const endDate = new Date();

  const unitQuery = admin.from("units").select("created_at, unit_type, finishing_status, rent_sale, cash_required, remaining, compound_name, created_by, assigned_employee");
  const clientQuery = admin.from("clients").select("created_at, unit_type, source, created_by, assigned_employee");
  const taskQuery = admin.from("tasks").select("status, created_by, assigned_to");
  const dealQuery = admin.from("generated_deals").select("recommendation_status, created_by");

  if (!isAdmin) {
    unitQuery.or(`created_by.eq.${userId},assigned_employee.eq.${userId}`);
    clientQuery.or(`created_by.eq.${userId},assigned_employee.eq.${userId}`);
    taskQuery.or(`created_by.eq.${userId},assigned_to.eq.${userId}`);
    dealQuery.eq("created_by", userId);
  }

  const [{ data: units }, { data: clients }, { data: tasks }, { data: deals }] =
    await Promise.all([unitQuery, clientQuery, taskQuery, dealQuery]);

  const unitList = (units ?? []) as Record<string, unknown>[];
  const clientList = (clients ?? []) as Record<string, unknown>[];
  const taskList = (tasks ?? []) as Record<string, unknown>[];
  const dealList = (deals ?? []) as Record<string, unknown>[];

  const unitsByMonth = fillMonthly(unitList as { created_at: string }[], rangeMonths, endDate);
  const clientsByMonth = fillMonthly(clientList as { created_at: string }[], rangeMonths, endDate);

  const unitsByType = toCategory(unitList, "unit_type");
  const unitsByFinishing = toCategory(unitList, "finishing_status");
  const unitsByRentSale = toCategory(unitList, "rent_sale");
  const clientsByUnitType = toCategory(clientList, "unit_type");
  const clientsBySource = toCategory(clientList, "source", 8);
  const tasksByStatus = (() => {
    const statusMap = new Map<string, number>();
    for (const t of taskList) {
      const s = String(t.status ?? "");
      if (s) statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
    }
    const order = ["active", "overdue", "completed"];
    return order
      .filter((s) => statusMap.has(s))
      .map((s, i) => ({ name: s, value: statusMap.get(s) ?? 0, color: CHART_COLORS[i % CHART_COLORS.length] }));
  })();

  const totalCashRequired = unitList.reduce((s, u) => s + (Number(u.cash_required) || 0), 0);
  const totalRemaining = unitList.reduce((s, u) => s + (Number(u.remaining) || 0), 0);

  const compoundMap = new Map<string, number>();
  for (const u of unitList) {
    const c = String(u.compound_name ?? "").trim();
    if (c) compoundMap.set(c, (compoundMap.get(c) ?? 0) + 1);
  }
  const topCompounds = [...compoundMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    unitsByMonth,
    clientsByMonth,
    unitsByType,
    unitsByFinishing,
    unitsByRentSale,
    clientsByUnitType,
    clientsBySource,
    tasksByStatus,
    totalUnits: unitList.length,
    totalClients: clientList.length,
    totalTasks: taskList.length,
    totalDeals: dealList.length,
    totalCashRequired,
    totalRemaining,
    approvedDeals: dealList.filter((d) => d.recommendation_status === "approved").length,
    rejectedDeals: dealList.filter((d) => d.recommendation_status === "rejected").length,
    pendingDeals: dealList.filter((d) => d.recommendation_status === "pending").length,
    topCompounds,
    tasksOverdue: taskList.filter((t) => t.status === "overdue").length,
    tasksCompleted: taskList.filter((t) => t.status === "completed").length,
    tasksActive: taskList.filter((t) => t.status === "active").length,
  };
}
