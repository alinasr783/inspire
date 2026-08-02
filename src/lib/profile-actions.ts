"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProfileActionResult =
  | { success: true; avatar_url?: string | null }
  | { success: false; error: string };

export async function updateProfile(
  formData: FormData
): Promise<ProfileActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "unauthorized" };
    }

    const firstName = formData.get("first_name") as string;
    const secondName = formData.get("second_name") as string;
    const avatarFile = formData.get("avatar") as File | null;

    const admin = createAdminClient();

    let avatar_url: string | null = null;

    if (avatarFile && avatarFile.size > 0) {
      const fileExt = avatarFile.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await admin.storage
        .from("avatars")
        .upload(filePath, avatarFile, {
          contentType: avatarFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[updateProfile] Upload error:", JSON.stringify(uploadError));
        return { success: false, error: "uploadFailed" };
      }

      const {
        data: { publicUrl },
      } = admin.storage.from("avatars").getPublicUrl(filePath);

      avatar_url = publicUrl;
    }

    const updates: Record<string, unknown> = {
      first_name: firstName,
      second_name: secondName,
      updated_at: new Date().toISOString(),
    };

    if (avatar_url) {
      updates.avatar_url = avatar_url;
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (updateError) {
      console.error("[updateProfile] DB update error:", JSON.stringify(updateError));
      return { success: false, error: "saveFailed" };
    }

    revalidatePath("/", "layout");

    return { success: true, avatar_url };
  } catch (err) {
    console.error("[updateProfile] Unexpected error:", err);
    return { success: false, error: "saveFailed" };
  }
}

export async function removeAvatar(): Promise<ProfileActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "unauthorized" };
    }

    const admin = createAdminClient();

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[removeAvatar] DB update error:", JSON.stringify(updateError));
      return { success: false, error: "saveFailed" };
    }

    revalidatePath("/", "layout");

    return { success: true, avatar_url: null };
  } catch (err) {
    console.error("[removeAvatar] Unexpected error:", err);
    return { success: false, error: "saveFailed" };
  }
}
