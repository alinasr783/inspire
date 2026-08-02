"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDealsMatching } from "@/lib/matching-engine";

export type DealRow = {
  id: string;
  client_id: string;
  property_id: string;
  rank: number;
  final_score: number;
  system_score: number;
  ai_score: number;
  ai_confidence: number;
  budget_match: number;
  unit_type_match: number;
  bedrooms_match: number;
  freshness_score: number;
  hard_filter_results: Record<string, unknown>;
  ai_analysis: Record<string, unknown>;
  recommendation_status: "pending" | "approved" | "rejected";
  created_by: string;
  created_at: string;
  client?: {
    id: string;
    customer_name: string;
    phone: string;
    unit_type: string | null;
    budget_from: number | null;
    budget_to: number | null;
    preferred_area: string | null;
    bedrooms: string | null;
  };
  unit?: {
    id: string;
    customer_name: string;
    phone: string;
    area: string | null;
    building_number: string | null;
    compound_name: string;
    finishing_status: string | null;
    rent_sale: string | null;
    unit_type: string | null;
    cash_required: number | null;
    remaining: number | null;
  };
};

type ActionResult = { success: true } | { success: false; error: string };

export async function generateAllDeals(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();

  const { data: clients } = await admin
    .from("clients")
    .select("id")
    .order("created_at", { ascending: false });

  if (!clients || clients.length === 0) {
    return { success: false, error: "no_clients" };
  }

  const results = await Promise.allSettled(
    clients.map((c) => runDealsMatching(c.id))
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(`[generateAllDeals] ${failed}/${clients.length} clients failed`);
  }

  revalidatePath("/deals");

  return { success: true };
}

export async function getClientDeals(clientId?: string): Promise<DealRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const admin = createAdminClient();

  let query = admin
    .from("generated_deals")
    .select(`
      *,
      client:clients!inner(id, customer_name, phone, unit_type, budget_from, budget_to, preferred_area, bedrooms),
      unit:units!inner(id, customer_name, phone, area, building_number, compound_name, finishing_status, rent_sale, unit_type, cash_required, remaining)
    `)
    .order("final_score", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getClientDeals] Query error:", error);
    return [];
  }

  return (data as unknown as DealRow[]) ?? [];
}

export async function getDealsByStatus(
  status?: "pending" | "approved" | "rejected"
): Promise<DealRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const admin = createAdminClient();

  let query = admin
    .from("generated_deals")
    .select(`
      *,
      client:clients!inner(id, customer_name, phone, unit_type, budget_from, budget_to, preferred_area, bedrooms),
      unit:units!inner(id, customer_name, phone, area, building_number, compound_name, finishing_status, rent_sale, unit_type, cash_required, remaining)
    `)
    .order("final_score", { ascending: false });

  if (status) {
    query = query.eq("recommendation_status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getDealsByStatus] Query error:", error);
    return [];
  }

  return (data as unknown as DealRow[]) ?? [];
}

export async function updateDealStatus(
  dealId: string,
  status: "approved" | "rejected"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();

  const { error } = await admin
    .from("generated_deals")
    .update({ recommendation_status: status })
    .eq("id", dealId);

  if (error) {
    console.error("[updateDealStatus] Error:", error);
    return { success: false, error: "update_failed" };
  }

  revalidatePath("/deals");

  return { success: true };
}

export async function deleteDeal(dealId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();

  const { error } = await admin
    .from("generated_deals")
    .delete()
    .eq("id", dealId);

  if (error) {
    console.error("[deleteDeal] Error:", error);
    return { success: false, error: "delete_failed" };
  }

  revalidatePath("/deals");

  return { success: true };
}
