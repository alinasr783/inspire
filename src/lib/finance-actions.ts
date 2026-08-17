"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type ContactType,
  type DealSide,
  type DealRow,
  type DealWithRelations,
  type FinanceSummary,
  type EmployeeProfitSummary,
  type PartnerProfitSummary,
  type TimeFilter,
  getTimeFilterDate,
  calcManualCommission,
  calcCompanyNetProfit,
  calcNathryat,
  calcEmployeePool,
  calcEmployeeProfit,
  calcPartnerProfit,
} from "@/lib/finance-types";

export type ActionResult = { success: true } | { success: false; error: string };

async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

type CreateDealInput = {
  contact_type: ContactType;
  ad_campaign_id?: string | null;
  buyer_name?: string;
  seller_name?: string;
  buyer_amount?: number | null;
  seller_amount?: number | null;
  buyer_commission?: number | null;
  seller_commission?: number | null;
  building_number?: string;
  apartment_number?: string;
  compound_name?: string;
  expenses?: number;
  final_commission: number;
  company_percentage?: number;
  employee_percentage?: number;
  employees?: {
    employee_id: string;
    side: DealSide;
    percentage: number;
  }[];
  partners?: {
    partner_id: string;
    percentage: number;
  }[];
};

export async function createDeal(input: CreateDealInput): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const hasEmployee = !!(input.employees && input.employees.length > 0);
  const companyPct = input.company_percentage ?? 70;
  const employeePct = input.employee_percentage ?? 30;

  const manualCommission = calcManualCommission(input.contact_type, input.buyer_commission, input.seller_commission);
  const expenses = input.expenses ?? 0;
  const companyNetProfit = calcCompanyNetProfit(input.final_commission, companyPct, hasEmployee, expenses);
  const nathryat = calcNathryat(input.final_commission, companyPct, hasEmployee);

  const { data: deal, error: dealError } = await admin
    .from("deals")
    .insert({
      created_by: user.id,
      contact_type: input.contact_type,
      ad_campaign_id: input.ad_campaign_id || null,
      buyer_name: input.buyer_name || "",
      seller_name: input.seller_name || "",
      buyer_amount: input.buyer_amount ?? null,
      seller_amount: input.seller_amount ?? null,
      buyer_commission: input.buyer_commission ?? null,
      seller_commission: input.seller_commission ?? null,
      building_number: input.building_number || "",
      apartment_number: input.apartment_number || "",
      compound_name: input.compound_name || "",
      expenses: expenses,
      auto_commission: manualCommission,
      final_commission: input.final_commission,
      has_employee: hasEmployee,
      company_percentage: companyPct,
      employee_percentage: employeePct,
      company_net_profit: companyNetProfit,
      nathryat: nathryat,
    })
    .select("id")
    .single();

  if (dealError) {
    console.error("createDeal error:", dealError);
    return { success: false, error: dealError.message || "create-failed" };
  }
  if (!deal) return { success: false, error: "no-data-returned" };

  if (hasEmployee && input.employees) {
    const employeePool = calcEmployeePool(input.final_commission, employeePct, true);
    const employeeRows = input.employees.map((emp) => ({
      deal_id: deal.id,
      employee_id: emp.employee_id,
      side: emp.side,
      percentage: emp.percentage,
      profit_amount: calcEmployeeProfit(employeePool, emp.percentage),
    }));
    const { error: empError } = await admin.from("deal_employees").insert(employeeRows);
    if (empError) return { success: false, error: "employees-failed" };
  }

  if (input.partners && input.partners.length > 0) {
    const partnerRows = input.partners.map((p) => ({
      deal_id: deal.id,
      partner_id: p.partner_id,
      percentage: p.percentage,
      profit_amount: calcPartnerProfit(companyNetProfit, p.percentage),
    }));
    const { error: partnerError } = await admin.from("deal_partners").insert(partnerRows);
    if (partnerError) return { success: false, error: "partners-failed" };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateDeal(dealId: string, input: CreateDealInput): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const hasEmployee = !!(input.employees && input.employees.length > 0);
  const companyPct = input.company_percentage ?? 70;
  const employeePct = input.employee_percentage ?? 30;

  const manualCommission = calcManualCommission(input.contact_type, input.buyer_commission, input.seller_commission);
  const expenses = input.expenses ?? 0;
  const companyNetProfit = calcCompanyNetProfit(input.final_commission, companyPct, hasEmployee, expenses);
  const nathryat = calcNathryat(input.final_commission, companyPct, hasEmployee);

  // Verify deal exists and user can edit
  const { data: existing } = await admin.from("deals").select("id").eq("id", dealId).single();
  if (!existing) return { success: false, error: "not-found" };

  const { error: dealError } = await admin
    .from("deals")
    .update({
      contact_type: input.contact_type,
      ad_campaign_id: input.ad_campaign_id || null,
      buyer_name: input.buyer_name || "",
      seller_name: input.seller_name || "",
      buyer_amount: input.buyer_amount ?? null,
      seller_amount: input.seller_amount ?? null,
      buyer_commission: input.buyer_commission ?? null,
      seller_commission: input.seller_commission ?? null,
      building_number: input.building_number || "",
      apartment_number: input.apartment_number || "",
      compound_name: input.compound_name || "",
      expenses: expenses,
      auto_commission: manualCommission,
      final_commission: input.final_commission,
      has_employee: hasEmployee,
      company_percentage: companyPct,
      employee_percentage: employeePct,
      company_net_profit: companyNetProfit,
      nathryat: nathryat,
    })
    .eq("id", dealId);

  if (dealError) {
    console.error("updateDeal error:", dealError);
    return { success: false, error: dealError.message || "update-failed" };
  }

  // Replace employees
  await admin.from("deal_employees").delete().eq("deal_id", dealId);

  if (hasEmployee && input.employees) {
    const employeePool = calcEmployeePool(input.final_commission, employeePct, true);
    const employeeRows = input.employees.map((emp) => ({
      deal_id: dealId,
      employee_id: emp.employee_id,
      side: emp.side,
      percentage: emp.percentage,
      profit_amount: calcEmployeeProfit(employeePool, emp.percentage),
    }));
    const { error: empError } = await admin.from("deal_employees").insert(employeeRows);
    if (empError) return { success: false, error: "employees-failed" };
  }

  // Replace partners
  await admin.from("deal_partners").delete().eq("deal_id", dealId);

  if (input.partners && input.partners.length > 0) {
    const partnerRows = input.partners.map((p) => ({
      deal_id: dealId,
      partner_id: p.partner_id,
      percentage: p.percentage,
      profit_amount: calcPartnerProfit(companyNetProfit, p.percentage),
    }));
    const { error: partnerError } = await admin.from("deal_partners").insert(partnerRows);
    if (partnerError) return { success: false, error: "partners-failed" };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteDeal(dealId: string): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };
  const admin = createAdminClient();
  const { error } = await admin.from("deals").delete().eq("id", dealId);
  if (error) return { success: false, error: "delete-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getDeal(dealId: string): Promise<DealWithRelations | null> {
  if (!(await isAdmin())) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("deals")
    .select(`
      *,
      buyer_client:clients!deals_buyer_client_id_fkey(*),
      seller_unit:units!deals_seller_unit_id_fkey(*),
      employees:deal_employees(*, profile:profiles!deal_employees_employee_id_fkey(id, first_name, second_name, position, avatar_url)),
      partners:deal_partners(*, profile:profiles!deal_partners_partner_id_fkey(id, first_name, second_name, position, avatar_url))
    `)
    .eq("id", dealId)
    .single();
  return (data ?? null) as unknown as DealWithRelations;
}

export async function queryFinances(timeFilter: TimeFilter = "all"): Promise<{
  deals: DealWithRelations[];
  summary: FinanceSummary;
}> {
  if (!(await isAdmin())) return { deals: [], summary: emptySummary() };

  const admin = createAdminClient();
  const sinceDate = getTimeFilterDate(timeFilter);

  let dealQuery = admin
    .from("deals")
    .select(`
      *,
      buyer_client:clients!deals_buyer_client_id_fkey(id, customer_name, phone),
      seller_unit:units!deals_seller_unit_id_fkey(id, customer_name, compound_name, unit_type),
      employees:deal_employees(*, profile:profiles!deal_employees_employee_id_fkey(id, first_name, second_name, avatar_url)),
      partners:deal_partners(*, profile:profiles!deal_partners_partner_id_fkey(id, first_name, second_name, position, avatar_url))
    `)
    .order("created_at", { ascending: false });

  if (sinceDate) {
    dealQuery = dealQuery.gte("created_at", sinceDate.toISOString());
  }

  const { data: deals } = await dealQuery;
  const dealList = (deals ?? []) as unknown as DealWithRelations[];

  return {
    deals: dealList,
    summary: computeSummary(dealList),
  };
}

export async function queryFinancesSimple(): Promise<DealRow[]> {
  if (!(await isAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin.from("deals").select("*").order("created_at", { ascending: false });
  return (data ?? []) as DealRow[];
}

function emptySummary(): FinanceSummary {
  return { total_deals: 0, total_commission: 0, total_company_net_profit: 0, total_employee_profit: 0, total_nathryat: 0, employee_profits: [], partner_profits: [] };
}

function computeSummary(deals: DealWithRelations[]): FinanceSummary {
  const employeeMap = new Map<string, { first_name: string | null; second_name: string | null; avatar_url: string | null; total_profit: number; deal_count: number }>();
  const partnerMap = new Map<string, { first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null; total_profit: number; deal_count: number }>();

  let totalCommission = 0;
  let totalCompanyNet = 0;
  let totalNathryat = 0;

  for (const deal of deals) {
    totalCommission += deal.final_commission;
    totalCompanyNet += deal.company_net_profit;
    totalNathryat += deal.nathryat || 0;

    for (const emp of deal.employees ?? []) {
      const existing = employeeMap.get(emp.employee_id);
      if (existing) {
        existing.total_profit += emp.profit_amount;
        existing.deal_count += 1;
      } else {
        employeeMap.set(emp.employee_id, {
          first_name: emp.profile?.first_name ?? null,
          second_name: emp.profile?.second_name ?? null,
          avatar_url: emp.profile?.avatar_url ?? null,
          total_profit: emp.profit_amount,
          deal_count: 1,
        });
      }
    }

    for (const part of deal.partners ?? []) {
      const existing = partnerMap.get(part.partner_id);
      if (existing) {
        existing.total_profit += part.profit_amount;
        existing.deal_count += 1;
      } else {
        partnerMap.set(part.partner_id, {
          first_name: part.profile?.first_name ?? null,
          second_name: part.profile?.second_name ?? null,
          position: part.profile?.position ?? null,
          avatar_url: part.profile?.avatar_url ?? null,
          total_profit: part.profit_amount,
          deal_count: 1,
        });
      }
    }
  }

  const employeeProfits: EmployeeProfitSummary[] = Array.from(employeeMap.entries())
    .map(([employee_id, data]) => ({
      employee_id,
      first_name: data.first_name,
      second_name: data.second_name,
      avatar_url: data.avatar_url,
      total_profit: Math.round(data.total_profit * 100) / 100,
      deal_count: data.deal_count,
    }))
    .sort((a, b) => b.total_profit - a.total_profit);

  const partnerProfits: PartnerProfitSummary[] = Array.from(partnerMap.entries())
    .map(([partner_id, data]) => ({
      partner_id,
      first_name: data.first_name,
      second_name: data.second_name,
      position: data.position,
      avatar_url: data.avatar_url,
      total_profit: Math.round(data.total_profit * 100) / 100,
      deal_count: data.deal_count,
    }))
    .sort((a, b) => b.total_profit - a.total_profit);

  const totalEmployeeProfit = employeeProfits.reduce((s, e) => s + e.total_profit, 0);

  return {
    total_deals: deals.length,
    total_commission: Math.round(totalCommission * 100) / 100,
    total_company_net_profit: Math.round(totalCompanyNet * 100) / 100,
    total_employee_profit: Math.round(totalEmployeeProfit * 100) / 100,
    total_nathryat: Math.round(totalNathryat * 100) / 100,
    employee_profits: employeeProfits,
    partner_profits: partnerProfits,
  };
}

export async function queryEmployeesForSelect() {
  if (!(await isAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, first_name, second_name, position, avatar_url")
    .eq("approval_status", "approved")
    .order("first_name", { ascending: true });
  return (data ?? []) as { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null }[];
}

export async function queryClientsSelect() {
  if (!(await isAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin.from("clients").select("id, customer_name, phone").order("customer_name", { ascending: true });
  return (data ?? []) as { id: string; customer_name: string; phone: string }[];
}

export async function queryUnitsSelect() {
  if (!(await isAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin.from("units").select("id, customer_name, compound_name, unit_type").order("customer_name", { ascending: true });
  return (data ?? []) as { id: string; customer_name: string; compound_name: string | null; unit_type: string | null }[];
}

export async function getFullDealDetail(dealId: string): Promise<DealWithRelations | null> {
  if (!(await isAdmin())) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("deals")
    .select(`
      *,
      buyer_client:clients!deals_buyer_client_id_fkey(*),
      seller_unit:units!deals_seller_unit_id_fkey(*),
      employees:deal_employees(*, profile:profiles!deal_employees_employee_id_fkey(id, first_name, second_name, position, avatar_url)),
      partners:deal_partners(*, profile:profiles!deal_partners_partner_id_fkey(id, first_name, second_name, position, avatar_url))
    `)
    .eq("id", dealId)
    .single();
  return (data ?? null) as unknown as DealWithRelations;
}

export async function getEmployeeFinanceDetail(employeeId: string): Promise<{
  profile: { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null };
  deals: DealWithRelations[];
  total_profit: number;
  deal_count: number;
} | null> {
  if (!(await isAdmin())) return null;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, first_name, second_name, position, avatar_url")
    .eq("id", employeeId)
    .single();

  if (!profile) return null;

  const { data: employeeRecords } = await admin
    .from("deal_employees")
    .select("deal_id, side, percentage, profit_amount")
    .eq("employee_id", employeeId);

  if (!employeeRecords || employeeRecords.length === 0) {
    return {
      profile: profile as { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null },
      deals: [],
      total_profit: 0,
      deal_count: 0,
    };
  }

  const dealIds = employeeRecords.map((r) => r.deal_id);

  const { data: deals } = await admin
    .from("deals")
    .select(`
      *,
      buyer_client:clients!deals_buyer_client_id_fkey(id, customer_name, phone),
      seller_unit:units!deals_seller_unit_id_fkey(id, customer_name, compound_name, unit_type),
      employees:deal_employees(*, profile:profiles!deal_employees_employee_id_fkey(id, first_name, second_name, avatar_url))
    `)
    .in("id", dealIds)
    .order("created_at", { ascending: false });

  const dealList = (deals ?? []) as unknown as DealWithRelations[];

  const totalProfit = employeeRecords
    .filter((r) => r.deal_id !== null)
    .reduce((s, r) => s + (r.profit_amount || 0), 0);

  return {
    profile: profile as { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null },
    deals: dealList,
    total_profit: Math.round(totalProfit * 100) / 100,
    deal_count: dealList.length,
  };
}

// ── Partners ──

export type PartnerConfigRow = {
  id: string;
  partner_id: string;
  created_by: string;
  created_at: string;
  profile: {
    id: string;
    first_name: string | null;
    second_name: string | null;
    position: string | null;
    avatar_url: string | null;
  };
};

export async function getPartnersConfig(): Promise<PartnerConfigRow[]> {
  if (!(await isAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("partners")
    .select("*, profile:profiles!partners_partner_id_fkey(id, first_name, second_name, position, avatar_url)")
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as PartnerConfigRow[];
}

export async function getPartnerCandidates(currentUserId: string): Promise<{
  id: string;
  first_name: string | null;
  second_name: string | null;
  position: string | null;
  avatar_url: string | null;
  is_current_user: boolean;
}[]> {
  if (!(await isAdmin())) return [];
  const admin = createAdminClient();

  const [partnersRes, currentRes] = await Promise.all([
    admin.from("partners").select("partner_id"),
    admin.from("profiles").select("id, first_name, second_name, position, avatar_url").eq("id", currentUserId).single(),
  ]);

  const partnerIds = new Set((partnersRes.data ?? []).map((p: { partner_id: string }) => p.partner_id));

  const result: { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null; is_current_user: boolean }[] = [];

  // Add current user first (deal creator)
  if (currentRes.data) {
    result.push({
      id: currentRes.data.id,
      first_name: currentRes.data.first_name,
      second_name: currentRes.data.second_name,
      position: currentRes.data.position,
      avatar_url: currentRes.data.avatar_url,
      is_current_user: true,
    });
  }

  // Add fixed partners (excluding current user to avoid duplicates)
  if (partnerIds.size > 0) {
    const { data: partnerProfiles } = await admin
      .from("profiles")
      .select("id, first_name, second_name, position, avatar_url")
      .in("id", Array.from(partnerIds));

    for (const p of partnerProfiles ?? []) {
      if (p.id === currentUserId) continue;
      result.push({
        id: p.id,
        first_name: p.first_name,
        second_name: p.second_name,
        position: p.position,
        avatar_url: p.avatar_url,
        is_current_user: false,
      });
    }
  }

  return result;
}

export async function getAdminUsersForPartners(): Promise<{
  id: string;
  first_name: string | null;
  second_name: string | null;
  position: string | null;
  avatar_url: string | null;
}[]> {
  if (!(await isAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, first_name, second_name, position, avatar_url")
    .eq("approval_status", "approved")
    .eq("role", "admin")
    .order("first_name", { ascending: true });
  return (data ?? []) as { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null }[];
}

export async function addPartner(partnerId: string): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();

  // Verify the target user is an approved admin
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("role, approval_status")
    .eq("id", partnerId)
    .single();
  if (!targetProfile || targetProfile.role !== "admin" || targetProfile.approval_status !== "approved") {
    return { success: false, error: "not-an-admin" };
  }

  const { error } = await admin.from("partners").insert({
    partner_id: partnerId,
    created_by: user.id,
  });
  if (error) {
    // If duplicate, treat as already added
    if ((error as { code?: string }).code === "23505") return { success: true };
    return { success: false, error: "add-failed" };
  }
  revalidatePath("/", "layout");
  return { success: true };
}

export async function removePartner(partnerId: string): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };
  const admin = createAdminClient();
  const { error } = await admin.from("partners").delete().eq("partner_id", partnerId);
  if (error) return { success: false, error: "remove-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function getPartnerFinanceDetail(partnerId: string): Promise<{
  profile: { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null };
  deals: DealWithRelations[];
  total_profit: number;
  deal_count: number;
} | null> {
  if (!(await isAdmin())) return null;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, first_name, second_name, position, avatar_url")
    .eq("id", partnerId)
    .single();

  if (!profile) return null;

  const { data: partnerRecords } = await admin
    .from("deal_partners")
    .select("deal_id, percentage, profit_amount")
    .eq("partner_id", partnerId);

  if (!partnerRecords || partnerRecords.length === 0) {
    return {
      profile: profile as { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null },
      deals: [],
      total_profit: 0,
      deal_count: 0,
    };
  }

  const dealIds = partnerRecords.map((r) => r.deal_id);

  const { data: deals } = await admin
    .from("deals")
    .select(`
      *,
      buyer_client:clients!deals_buyer_client_id_fkey(id, customer_name, phone),
      seller_unit:units!deals_seller_unit_id_fkey(id, customer_name, compound_name, unit_type),
      partners:deal_partners(*, profile:profiles!deal_partners_partner_id_fkey(id, first_name, second_name, position, avatar_url))
    `)
    .in("id", dealIds)
    .order("created_at", { ascending: false });

  const dealList = (deals ?? []) as unknown as DealWithRelations[];

  const totalProfit = partnerRecords
    .filter((r) => r.deal_id !== null)
    .reduce((s, r) => s + (r.profit_amount || 0), 0);

  return {
    profile: profile as { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null },
    deals: dealList,
    total_profit: Math.round(totalProfit * 100) / 100,
    deal_count: dealList.length,
  };
}
