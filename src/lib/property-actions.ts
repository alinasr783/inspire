"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const propertySchema = z.object({
  title: z.string().trim().min(1, "title-required"),
  description: z.string().trim().default(""),
  price: z.coerce.number().positive().optional(),
  status: z.enum(["available", "sold", "rented", "under_construction", "reserved"]),
  type: z.enum(["apartment", "villa", "duplex", "office", "land", "commercial", "other"]),
  location: z.string().trim().default(""),
  address: z.string().trim().default(""),
  area_sqm: z.coerce.number().positive().optional(),
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  bathrooms: z.coerce.number().int().nonnegative().optional(),
  floors: z.coerce.number().int().nonnegative().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

type PropertyInput = z.infer<typeof propertySchema>;

export async function createProperty(formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const key of Object.keys(propertySchema.shape)) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }
  raw.assigned_to = formData.get("assigned_to") || user.id;

  const parsed = propertySchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/${locale}/properties/new?error=validation`);
  }

  const { error } = await supabase.from("properties").insert({
    ...parsed.data,
    assigned_to: parsed.data.assigned_to ?? user.id,
    created_by: user.id,
  });

  if (error) {
    redirect(`/${locale}/properties/new?error=create-failed`);
  }

  redirect(`/${locale}/properties`);
}

export async function updateProperty(id: string, formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const raw: Record<string, FormDataEntryValue | null> = {};
  for (const key of Object.keys(propertySchema.shape)) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }
  raw.assigned_to = formData.get("assigned_to") || user.id;

  const parsed = propertySchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/${locale}/properties/${id}?error=validation`);
  }

  const { data: existing } = await supabase
    .from("properties")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!existing || (existing.created_by !== user.id && user.role !== "admin")) {
    redirect(`/${locale}/properties/${id}?error=unauthorized`);
  }

  const { error } = await supabase
    .from("properties")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/${locale}/properties/${id}?error=update-failed`);
  }

  redirect(`/${locale}/properties/${id}`);
}

export async function deleteProperty(id: string) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const { data: existing } = await supabase
    .from("properties")
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

  const { error } = await supabase.from("properties").delete().eq("id", id);

  if (error) {
    redirect(`/${locale}/properties?error=delete-failed`);
  }

  redirect(`/${locale}/properties`);
}
