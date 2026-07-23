"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ColumnConfig = {
  id: string;
  key: string;
  label_ar: string;
  label_en: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  options: string[] | null;
  sort_order: number;
  enabled: boolean;
  is_builtin: boolean;
  created_at: string;
};

const columnSchema = z.object({
  key: z.string().trim().min(1).max(50),
  label_ar: z.string().trim().min(1),
  label_en: z.string().trim().min(1),
  type: z.enum(["text", "number", "date", "select", "textarea"]),
  options: z.array(z.string()).optional().default([]),
  sort_order: z.coerce.number().int().nonnegative().default(0),
  enabled: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .pipe(z.boolean()),
});

export async function getColumnConfig(): Promise<ColumnConfig[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("unit_column_config")
    .select("*")
    .order("sort_order", { ascending: true });

  return (data ?? []) as ColumnConfig[];
}

export async function saveColumnConfig(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(columnSchema.shape)) {
    if (key === "options") continue;
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const optionsRaw = formData.get("options");
  if (optionsRaw && typeof optionsRaw === "string") {
    raw.options = optionsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
  }

  const parsed = columnSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validation-failed" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const id = formData.get("id");
  if (id && typeof id === "string" && id.length > 0) {
    const { error } = await supabase
      .from("unit_column_config")
      .update(parsed.data)
      .eq("id", id);

    if (error) return { error: "update-failed" };
  } else {
    const { error } = await supabase
      .from("unit_column_config")
      .insert(parsed.data);

    if (error) return { error: "create-failed" };
  }

  return { success: true };
}

export async function updateColumnOrder(orders: { id: string; sort_order: number }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const promises = orders.map(({ id, sort_order }) =>
    supabase.from("unit_column_config").update({ sort_order }).eq("id", id)
  );
  const results = await Promise.all(promises);
  const error = results.find((r) => r.error);
  if (error) return { error: "update-failed" };
  return { success: true };
}

export async function renameColumnConfig(id: string, label_ar: string, label_en: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const { error } = await supabase
    .from("unit_column_config")
    .update({ label_ar, label_en })
    .eq("id", id);

  if (error) return { error: "update-failed" };
  return { success: true };
}

export async function deleteColumnConfig(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const { error } = await supabase
    .from("unit_column_config")
    .delete()
    .eq("id", id);

  if (error) return { error: "delete-failed" };
  return { success: true };
}
