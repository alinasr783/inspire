"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  COLUMN_TYPES,
  OPTION_TYPES,
  type ColumnConfig,
  type UpdateColumnInput,
} from "@/lib/unit-config";

function normalizeOptions(input: unknown): string[] {
  const list = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split("\n")
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const v = String(raw ?? "").trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

const columnSchema = z.object({
  key: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_]+$/, "invalid-key"),
  label_ar: z.string().trim().min(1),
  label_en: z.string().trim().min(1),
  type: z.enum(COLUMN_TYPES),
  options: z.array(z.string()).optional().default([]),
  sort_order: z.coerce.number().int().nonnegative().default(0),
  enabled: z
    .union([z.string(), z.boolean()])
    .transform((v) => (typeof v === "boolean" ? v : v === "true" || v === "1"))
    .pipe(z.boolean()),
}).superRefine((data, ctx) => {
  if (OPTION_TYPES.includes(data.type) && (data.options ?? []).length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "options-required" });
  }
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
    raw.options = normalizeOptions(optionsRaw);
  }

  const parsed = columnSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    return { error: issue === "options-required" ? "options-required" : "validation-failed" };
  }
  parsed.data.options = normalizeOptions(parsed.data.options);

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
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) return { error: "unauthorized" };

  const { error } = await supabase
    .from("unit_column_config")
    .update({ label_ar, label_en })
    .eq("id", id);

  if (error) return { error: "update-failed" };
  return { success: true };
}

/**
 * Full edit of a column: labels, type, options, enabled.
 * Options are strictly normalized (trimmed, de-duplicated, empties dropped).
 * `select` / `multi_select` require at least one option.
 * Built-in columns are protected: their key (DB mapping), sort order and
 * visibility stay locked, but labels, data type and options may change.
 */
export async function updateColumnConfig(id: string, input: UpdateColumnInput) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) return { error: "unauthorized" };

  const { data: existing } = await supabase
    .from("unit_column_config")
    .select("*")
    .eq("id", id)
    .single();
  if (!existing) return { error: "not-found" };

  const existingCol = existing as ColumnConfig;
  const options = normalizeOptions(input.options ?? []);

  const parsed = columnSchema.safeParse({
    // Key is locked for built-in columns (it maps to a real DB column).
    key: existingCol.is_builtin ? existingCol.key : input.key,
    label_ar: input.label_ar,
    label_en: input.label_en,
    type: input.type,
    options,
    sort_order: existingCol.sort_order ?? 0,
    enabled: input.enabled ?? existingCol.enabled ?? true,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    return { error: issue === "options-required" ? "options-required" : "validation-failed" };
  }

  // Key must stay unique (custom columns only — built-in keys never change).
  if (!existingCol.is_builtin) {
    const { data: clash } = await supabase
      .from("unit_column_config")
      .select("id")
      .eq("key", parsed.data.key)
      .neq("id", id)
      .limit(1);
    if (clash && clash.length > 0) return { error: "key-exists" };
  }

  const payload: Record<string, unknown> = existingCol.is_builtin
    ? {
        label_ar: parsed.data.label_ar,
        label_en: parsed.data.label_en,
        type: parsed.data.type,
        options: OPTION_TYPES.includes(parsed.data.type) ? parsed.data.options : [],
      }
    : {
        key: parsed.data.key,
        label_ar: parsed.data.label_ar,
        label_en: parsed.data.label_en,
        type: parsed.data.type,
        enabled: parsed.data.enabled,
        options: OPTION_TYPES.includes(parsed.data.type) ? parsed.data.options : [],
      };

  const { error } = await supabase
    .from("unit_column_config")
    .update(payload)
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
