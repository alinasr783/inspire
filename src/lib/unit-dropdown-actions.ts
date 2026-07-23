"use server";

import { createClient } from "@/lib/supabase/server";

export async function getUnitDropdownOptions(category: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("unit_dropdown_options")
    .select("value")
    .eq("category", category)
    .order("value", { ascending: true });

  return (data ?? []).map((r) => r.value);
}

export async function addUnitDropdownOption(category: string, value: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const trimmed = value.trim();
  if (!trimmed) return { error: "empty-value" };

  const { error } = await supabase
    .from("unit_dropdown_options")
    .insert({ category, value: trimmed });

  if (error) {
    if (error.code === "23505") return { success: true };
    return { error: "insert-failed" };
  }

  return { success: true };
}
