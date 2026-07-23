"use server";

import { createClient } from "@/lib/supabase/server";

export type DropdownOption = {
  id: string;
  category: string;
  value: string;
};

export async function getDropdownOptions(category: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_dropdown_options")
    .select("value")
    .eq("category", category)
    .order("value", { ascending: true });

  return (data ?? []).map((r) => r.value);
}

export async function getAllEmployees(): Promise<{ id: string; name: string }[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, first_name, second_name")
    .eq("approval_status", "approved");
  return (data ?? []).map((p: { id: string; first_name: string | null; second_name: string | null }) => ({
    id: p.id,
    name: [p.first_name, p.second_name].filter(Boolean).join(" "),
  }));
}

export async function addDropdownOption(category: string, value: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const trimmed = value.trim();
  if (!trimmed) return { error: "empty-value" };

  const { error } = await supabase
    .from("client_dropdown_options")
    .insert({ category, value: trimmed });

  if (error) {
    if (error.code === "23505") return { success: true };
    return { error: "insert-failed" };
  }

  return { success: true };
}
