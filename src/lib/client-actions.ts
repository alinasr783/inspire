"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ClientRow = {
  id: string;
  customer_name: string;
  phone: string;
  phone_alt: string | null;
  budget_from: number | null;
  budget_to: number | null;
  payment_method: string | null;
  preferred_area: string | null;
  unit_type: string | null;
  bedrooms: string | null;
  preferred_developer: string | null;
  source: string | null;
  additional_notes: string | null;
  last_contact_date: string | null;
  assigned_employee: string | null;
  custom_fields: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const clientSchema = z.object({
  customer_name: z.string().trim().min(1, "customer-name-required"),
  phone: z.string().trim().min(1, "phone-required"),
  phone_alt: z.string().trim().optional(),
  budget_from: z.coerce.number().positive().optional(),
  budget_to: z.coerce.number().positive().optional(),
  payment_method: z.string().trim().optional(),
  preferred_area: z.string().trim().optional(),
  unit_type: z.string().trim().optional(),
  bedrooms: z.string().trim().optional(),
  preferred_developer: z.string().trim().optional(),
  source: z.string().trim().optional(),
  additional_notes: z.string().trim().optional(),
  last_contact_date: z.string().trim().optional(),
  assigned_employee: z.string().trim().optional(),
  custom_fields: z.record(z.string(), z.any()).optional().default({}),
});

export async function addClient(formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const key of Object.keys(clientSchema.shape)) {
    if (key === "custom_fields") continue;
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  let customFields: Record<string, unknown> = {};
  const customFieldsRaw = formData.get("custom_fields");
  if (customFieldsRaw && typeof customFieldsRaw === "string") {
    try {
      customFields = JSON.parse(customFieldsRaw);
    } catch {
      customFields = {};
    }
  }

  const parsed = clientSchema.safeParse({ ...raw, custom_fields: customFields });
  if (!parsed.success) {
    redirect(`/${locale}/clients/new?error=validation`);
  }

  const { error } = await supabase.from("clients").insert({
    ...parsed.data,
    created_by: user.id,
  });

  if (error) {
    redirect(`/${locale}/clients/new?error=create-failed`);
  }

  redirect(`/${locale}/clients`);
}

export async function updateClient(id: string, formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const key of Object.keys(clientSchema.shape)) {
    if (key === "custom_fields") continue;
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  let customFields: Record<string, unknown> = {};
  const customFieldsRaw = formData.get("custom_fields");
  if (customFieldsRaw && typeof customFieldsRaw === "string") {
    try {
      customFields = JSON.parse(customFieldsRaw);
    } catch {
      customFields = {};
    }
  }

  const parsed = clientSchema.safeParse({ ...raw, custom_fields: customFields });
  if (!parsed.success) {
    redirect(`/${locale}/clients/${id}?error=validation`);
  }

  const { data: existing } = await admin
    .from("clients")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    redirect(`/${locale}/clients?error=not-found`);
  }

  if (existing.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      redirect(`/${locale}/clients/${id}?error=unauthorized`);
    }
  }

  const { error } = await admin
    .from("clients")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/${locale}/clients/${id}?error=update-failed`);
  }

  redirect(`/${locale}/clients/${id}`);
}

export async function deleteClient(id: string) {
  const locale = await getLocale();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const { data: existing } = await admin
    .from("clients")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    redirect(`/${locale}/clients?error=not-found`);
  }

  if (existing.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      redirect(`/${locale}/clients?error=unauthorized`);
    }
  }

  const { error } = await admin.from("clients").delete().eq("id", id);

  if (error) {
    redirect(`/${locale}/clients?error=delete-failed`);
  }

  redirect(`/${locale}/clients`);
}

export async function updateClientField(clientId: string, field: string, value: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const allowedFields = [
    "customer_name", "phone", "phone_alt", "budget_from", "budget_to",
    "payment_method", "preferred_area", "unit_type", "bedrooms",
    "preferred_developer", "source", "additional_notes", "last_contact_date",
    "assigned_employee",
  ];

  const admin = createAdminClient();

  if (!allowedFields.includes(field)) {
    const { data: current } = await admin.from("clients").select("custom_fields").eq("id", clientId).single();
    const customFields = (current?.custom_fields ?? {}) as Record<string, unknown>;
    customFields[field] = value.trim() || null;
    const { error } = await admin
      .from("clients")
      .update({ custom_fields: customFields, updated_at: new Date().toISOString() })
      .eq("id", clientId);
    if (error) throw new Error("update-failed");
    return { success: true };
  }

  const numericFields = ["budget_from", "budget_to"];
  let updateValue: unknown = value;
  if (numericFields.includes(field)) {
    const trimmed = value.trim();
    updateValue = trimmed ? Number(trimmed) : null;
    if (trimmed && isNaN(updateValue as number)) updateValue = value;
  } else if (field === "last_contact_date") {
    updateValue = value.trim() || null;
  }

  const { error } = await admin
    .from("clients")
    .update({ [field]: updateValue, updated_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) throw new Error("update-failed");
  return { success: true };
}
