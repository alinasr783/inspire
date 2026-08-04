"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DailyAdRow = {
  id: string;
  employee_id: string;
  ad_count: number;
  entry_date: string;
  created_at: string;
  updated_at: string;
};

export type AdsByDate = { date: string; count: number }[];

export async function fetchAdsByEmployee(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<AdsByDate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("daily_ads")
    .select("entry_date, ad_count")
    .eq("employee_id", employeeId)
    .gte("entry_date", startDate)
    .lte("entry_date", endDate)
    .order("entry_date", { ascending: true });

  if (error) throw error;

  const result: AdsByDate = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  const adMap = new Map<string, number>();
  (data ?? []).forEach((row) => adMap.set(row.entry_date, row.ad_count));

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    result.push({ date: dateStr, count: adMap.get(dateStr) ?? 0 });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

export async function upsertDailyAd(
  employeeId: string,
  entryDate: string,
  adCount: number
): Promise<DailyAdRow> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("daily_ads")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (existing) {
    const { data, error } = await admin
      .from("daily_ads")
      .update({ ad_count: adCount })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as DailyAdRow;
  }

  const { data, error } = await admin
    .from("daily_ads")
    .insert({ employee_id: employeeId, entry_date: entryDate, ad_count: adCount })
    .select()
    .single();

  if (error) throw error;
  return data as DailyAdRow;
}

export async function getTodayAdCount(employeeId: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await admin
    .from("daily_ads")
    .select("ad_count")
    .eq("employee_id", employeeId)
    .eq("entry_date", today)
    .maybeSingle();

  if (error) throw error;
  return data?.ad_count ?? 0;
}
