"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CompanyClientRow = {
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
  seriousness_rating: number;
  custom_fields: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_company_client: boolean;
};

const companyClientSchema = z.object({
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
  ad_campaign_id: z.string().trim().optional().default(""),
  seriousness_rating: z.coerce.number().int().min(1).max(10),
  custom_fields: z.record(z.string(), z.any()).optional().default({}),
});

const LOCKED_FIELDS = ["customer_name", "phone"];

function extractFormData(formData: FormData) {
  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const key of Object.keys(companyClientSchema.shape)) {
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

  return companyClientSchema.safeParse({ ...raw, custom_fields: customFields });
}

async function getCurrentUser(locale: string) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) redirect(`/${locale}/auth/login`);
  return user;
}

async function getRole(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role ?? null;
}

export async function addCompanyClient(formData: FormData) {
  const locale = await getLocale();
  const user = await getCurrentUser(locale);

  const role = await getRole(user.id);
  if (role !== "admin") redirect(`/${locale}/company-clients?error=unauthorized`);

  const parsed = extractFormData(formData);
  if (!parsed.success) {
    redirect(`/${locale}/company-clients/new?error=validation`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    ...parsed.data,
    ad_campaign_id: parsed.data.ad_campaign_id || null,
    created_by: user.id,
    is_company_client: true,
  });

  if (error) {
    redirect(`/${locale}/company-clients/new?error=create-failed`);
  }

  redirect(`/${locale}/company-clients`);
}

export async function updateCompanyClient(id: string, formData: FormData) {
  const locale = await getLocale();
  const user = await getCurrentUser(locale);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("clients")
    .select("customer_name, phone, assigned_employee")
    .eq("id", id)
    .single();

  if (!existing) {
    redirect(`/${locale}/company-clients?error=not-found`);
  }

  const role = await getRole(user.id);
  const isAdmin = role === "admin";
  const isAssignee = existing.assigned_employee === user.id;

  if (!isAdmin && !isAssignee) {
    redirect(`/${locale}/company-clients/${id}?error=unauthorized`);
  }

  const parsed = extractFormData(formData);
  if (!parsed.success) {
    redirect(`/${locale}/company-clients/${id}?error=validation`);
  }

  // Non-admins cannot change the locked fields (customer_name, phone).
  const updateData: Record<string, unknown> = { ...parsed.data, ad_campaign_id: parsed.data.ad_campaign_id || null };
  if (!isAdmin) {
    updateData.customer_name = existing.customer_name;
    updateData.phone = existing.phone;
  }

  const { error } = await admin
    .from("clients")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/${locale}/company-clients/${id}?error=update-failed`);
  }

  redirect(`/${locale}/company-clients/${id}`);
}

export async function deleteCompanyClient(id: string) {
  const locale = await getLocale();
  const user = await getCurrentUser(locale);
  const admin = createAdminClient();

  const role = await getRole(user.id);
  if (role !== "admin") {
    redirect(`/${locale}/company-clients?error=unauthorized`);
  }

  const { error } = await admin.from("clients").delete().eq("id", id);

  if (error) throw new Error(`delete-failed: ${error.message}`);

  return { success: true };
}

export async function updateCompanyClientField(
  clientId: string,
  field: string,
  value: string
) {
  const locale = await getLocale();
  const user = await getCurrentUser(locale);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("clients")
    .select("assigned_employee")
    .eq("id", clientId)
    .single();

  if (!existing) throw new Error("not-found");

  const role = await getRole(user.id);
  const isAdmin = role === "admin";
  const isAssignee = existing.assigned_employee === user.id;

  if (!isAdmin && !isAssignee) throw new Error("unauthorized");

  if (LOCKED_FIELDS.includes(field) && !isAdmin) {
    throw new Error("field-locked");
  }

  const allowedFields = [
    "customer_name", "phone", "phone_alt", "budget_from", "budget_to",
    "payment_method", "preferred_area", "unit_type", "bedrooms",
    "preferred_developer", "source", "additional_notes", "last_contact_date",
    "assigned_employee", "seriousness_rating",
  ];

  if (!allowedFields.includes(field)) {
    const { data: current } = await admin
      .from("clients")
      .select("custom_fields")
      .eq("id", clientId)
      .single();
    const customFields = (current?.custom_fields ?? {}) as Record<string, unknown>;
    customFields[field] = value.trim() || null;
    const { error } = await admin
      .from("clients")
      .update({ custom_fields: customFields, updated_at: new Date().toISOString() })
      .eq("id", clientId);
    if (error) throw new Error("update-failed");
    return { success: true };
  }

  const numericFields = ["budget_from", "budget_to", "seriousness_rating"];
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
