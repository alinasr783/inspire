"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadCrmLogo(formData: FormData): Promise<{
  success: boolean;
  logoUrl?: string;
  error?: string;
}> {
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "No file provided" };
  }

  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from("crm")
    .upload("logo.png", file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { success: false, error: "Upload failed" };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("crm").getPublicUrl("logo.png");

  revalidatePath("/", "layout");

  return { success: true, logoUrl: publicUrl };
}

export async function getCrmLogoUrl(): Promise<string | null> {
  const admin = createAdminClient();

  try {
    const {
      data: { publicUrl },
    } = admin.storage.from("crm").getPublicUrl("logo.png");

    const response = await fetch(publicUrl, { method: "HEAD" });
    if (response.ok) return publicUrl;
    return null;
  } catch {
    return null;
  }
}
