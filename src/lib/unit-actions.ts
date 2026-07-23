"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UnitRow = {
  id: string;
  customer_name: string;
  phone: string;
  compound_name: string;
  area: string | null;
  building_number: string | null;
  finishing_status: string | null;
  rent_sale: string | null;
  unit_type: string | null;
  cash_required: number | null;
  remaining: number | null;
  last_contact_date: string | null;
  additional_notes: string | null;
  feedback: string | null;
  custom_fields: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const unitSchema = z.object({
  customer_name: z.string().trim().min(1, "customer-name-required"),
  phone: z.string().trim().min(1, "phone-required"),
  compound_name: z.string().trim().min(1, "compound-name-required"),
  area: z.string().trim().default(""),
  building_number: z.string().trim().default(""),
  finishing_status: z.string().trim().default(""),
  rent_sale: z.string().trim().default(""),
  unit_type: z.string().trim().default(""),
  cash_required: z.coerce.number().positive().optional(),
  remaining: z.coerce.number().positive().optional(),
  last_contact_date: z.string().trim().optional(),
  additional_notes: z.string().trim().default(""),
  feedback: z.string().trim().default(""),
  custom_fields: z.record(z.string(), z.any()).optional().default({}),
});

export async function createUnit(formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const key of Object.keys(unitSchema.shape)) {
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

  const parsed = unitSchema.safeParse({ ...raw, custom_fields: customFields });
  if (!parsed.success) {
    redirect(`/${locale}/properties/new?error=validation`);
  }

  const { error } = await supabase.from("units").insert({
    ...parsed.data,
    created_by: user.id,
  });

  if (error) {
    redirect(`/${locale}/properties/new?error=create-failed`);
  }

  redirect(`/${locale}/properties`);
}

export async function updateUnit(id: string, formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const key of Object.keys(unitSchema.shape)) {
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

  const parsed = unitSchema.safeParse({ ...raw, custom_fields: customFields });
  if (!parsed.success) {
    redirect(`/${locale}/properties/${id}?error=validation`);
  }

  const { data: existing } = await supabase
    .from("units")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    redirect(`/${locale}/properties?error=not-found`);
  }

  if (existing.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      redirect(`/${locale}/properties/${id}?error=unauthorized`);
    }
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("units")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/${locale}/properties/${id}?error=update-failed`);
  }

  redirect(`/${locale}/properties/${id}`);
}

export async function deleteUnit(id: string) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const { data: existing } = await supabase
    .from("units")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!existing) {
    redirect(`/${locale}/properties?error=not-found`);
  }

  if (existing.created_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      redirect(`/${locale}/properties?error=unauthorized`);
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("units").delete().eq("id", id);

  if (error) {
    redirect(`/${locale}/properties?error=delete-failed`);
  }

  redirect(`/${locale}/properties`);
}
