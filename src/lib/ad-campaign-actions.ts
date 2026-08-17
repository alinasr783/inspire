"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type AdCampaignInput,
  type AdCampaignDetail,
  type AdCampaignOption,
  type AdCampaignRow,
  type AdCampaignStats,
  type AdCampaignWithStats,
  type CampaignLinkedClient,
  type CampaignLinkedDeal,
  computeCampaignStats,
} from "@/lib/ad-campaign-types";

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

function toRow(c: AdCampaignRow): AdCampaignRow {
  return {
    ...c,
    total_cost: Number(c.total_cost ?? 0),
  };
}

// ─── Options (for dropdowns in forms) ───────────────────────────────────────

export async function queryCampaignsForSelect(): Promise<AdCampaignOption[]> {
  if (!(await isAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("ad_campaigns")
    .select("id, name, status, color")
    .order("name", { ascending: true });
  return (data ?? []) as AdCampaignOption[];
}

// ─── Overview with computed stats ───────────────────────────────────────────

export async function getAdCampaignsOverview(): Promise<AdCampaignWithStats[]> {
  if (!(await isAdmin())) return [];

  const admin = createAdminClient();

  const [{ data: campaigns }, { data: clientRows }, { data: dealRows }] = await Promise.all([
    admin.from("ad_campaigns").select("*").order("created_at", { ascending: false }),
    admin
      .from("clients")
      .select("ad_campaign_id")
      .not("ad_campaign_id", "is", null),
    admin
      .from("deals")
      .select("ad_campaign_id, final_commission, company_net_profit")
      .not("ad_campaign_id", "is", null),
  ]);

  const clientsByCampaign = new Map<string, number>();
  for (const row of clientRows ?? []) {
    const key = row.ad_campaign_id as string;
    clientsByCampaign.set(key, (clientsByCampaign.get(key) ?? 0) + 1);
  }

  const dealAgg = new Map<string, { count: number; commission: number; net: number }>();
  for (const row of dealRows ?? []) {
    const key = row.ad_campaign_id as string;
    const cur = dealAgg.get(key) ?? { count: 0, commission: 0, net: 0 };
    cur.count += 1;
    cur.commission += Number(row.final_commission ?? 0);
    cur.net += Number(row.company_net_profit ?? 0);
    dealAgg.set(key, cur);
  }

  return (campaigns ?? []).map((c) => {
    const raw = toRow(c as AdCampaignRow);
    const agg = dealAgg.get(raw.id);
    const stats = computeCampaignStats({
      totalCost: raw.total_cost,
      clientsCount: clientsByCampaign.get(raw.id) ?? 0,
      dealsCount: agg?.count ?? 0,
      totalCommission: agg?.commission ?? 0,
      totalCompanyNetProfit: agg?.net ?? 0,
    });
    return { ...raw, stats };
  });
}

// ─── Detail ─────────────────────────────────────────────────────────────────

export async function getAdCampaignDetail(id: string): Promise<AdCampaignDetail | null> {
  if (!(await isAdmin())) return null;

  const admin = createAdminClient();

  const [{ data: campaign }, { data: clients }, { data: deals }] = await Promise.all([
    admin.from("ad_campaigns").select("*").eq("id", id).single(),
    admin
      .from("clients")
      .select("id, customer_name, phone, phone_alt, budget_from, budget_to, preferred_area, unit_type, source, seriousness_rating, last_contact_date, created_by, created_at")
      .eq("ad_campaign_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("deals")
      .select("id, created_at, created_by, buyer_name, seller_name, buyer_amount, seller_amount, buyer_commission, seller_commission, final_commission, company_net_profit, nathryat, expenses, compound_name")
      .eq("ad_campaign_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!campaign) return null;

  const raw = toRow(campaign as AdCampaignRow);
  const clientsList = (clients ?? []) as unknown as CampaignLinkedClient[];
  const dealsList = (deals ?? []) as unknown as CampaignLinkedDeal[];

  const dealAgg = dealsList.reduce(
    (acc, d) => {
      acc.count += 1;
      acc.commission += Number(d.final_commission ?? 0);
      acc.net += Number(d.company_net_profit ?? 0);
      return acc;
    },
    { count: 0, commission: 0, net: 0 }
  );

  const stats = computeCampaignStats({
    totalCost: raw.total_cost,
    clientsCount: clientsList.length,
    dealsCount: dealAgg.count,
    totalCommission: dealAgg.commission,
    totalCompanyNetProfit: dealAgg.net,
  });

  return { campaign: raw, stats, clients: clientsList, deals: dealsList };
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export async function createCampaign(input: AdCampaignInput): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin.from("ad_campaigns").insert({
    name: input.name.trim(),
    total_cost: Number(input.total_cost) || 0,
    platform: input.platform?.trim() ?? "",
    status: input.status ?? "active",
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    notes: input.notes?.trim() ?? "",
    currency: input.currency || "EGP",
    color: input.color || "#276ef1",
    created_by: user.id,
  });

  if (error) {
    console.error("createCampaign error:", error);
    return { success: false, error: error.message || "create-failed" };
  }

  revalidatePath("/ad-campaigns", "layout");
  return { success: true };
}

export async function updateCampaign(id: string, input: AdCampaignInput): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("ad_campaigns").select("id").eq("id", id).single();
  if (!existing) return { success: false, error: "not-found" };

  const { error } = await admin
    .from("ad_campaigns")
    .update({
      name: input.name.trim(),
      total_cost: Number(input.total_cost) || 0,
      platform: input.platform?.trim() ?? "",
      status: input.status ?? "active",
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      notes: input.notes?.trim() ?? "",
      currency: input.currency || "EGP",
      color: input.color || "#276ef1",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("updateCampaign error:", error);
    return { success: false, error: error.message || "update-failed" };
  }

  revalidatePath("/ad-campaigns", "layout");
  return { success: true };
}

export async function deleteCampaign(id: string): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin.from("ad_campaigns").delete().eq("id", id);
  if (error) return { success: false, error: error.message || "delete-failed" };

  revalidatePath("/ad-campaigns", "layout");
  return { success: true };
}

// ─── Quick linking from tables ──────────────────────────────────────────────

export async function assignClientCampaign(
  clientId: string,
  campaignId: string | null
): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({ ad_campaign_id: campaignId, updated_at: new Date().toISOString() })
    .eq("id", clientId);
  if (error) return { success: false, error: error.message || "update-failed" };
  revalidatePath("/ad-campaigns", "layout");
  return { success: true };
}

export async function assignDealCampaign(
  dealId: string,
  campaignId: string | null
): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("deals")
    .update({ ad_campaign_id: campaignId })
    .eq("id", dealId);
  if (error) return { success: false, error: error.message || "update-failed" };
  revalidatePath("/ad-campaigns", "layout");
  return { success: true };
}
