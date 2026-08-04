"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type GallerySectionRow = {
  id: string;
  unit_id: string;
  name: string;
  created_by: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type GalleryImageRow = {
  id: string;
  section_id: string;
  storage_path: string;
  original_name: string | null;
  file_size: number | null;
  content_type: string | null;
  uploaded_by: string;
  sort_order: number;
  created_at: string;
  public_url?: string;
  uploader_name?: string;
};

export type GallerySectionWithImages = GallerySectionRow & {
  images: GalleryImageRow[];
};

async function checkGalleryPermission(unitId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") return true;

  const { data: unit } = await admin
    .from("units")
    .select("created_by, assigned_employee")
    .eq("id", unitId)
    .single();

  return unit?.created_by === userId || unit?.assigned_employee === userId;
}

export async function getUnitGallery(unitId: string): Promise<GallerySectionWithImages[]> {
  const admin = createAdminClient();

  const { data: sections, error: sectionsError } = await admin
    .from("unit_gallery_sections")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (sectionsError || !sections) return [];

  const sectionsWithImages: GallerySectionWithImages[] = [];

  for (const section of sections) {
    const { data: images, error: imagesError } = await admin
      .from("unit_gallery_images")
      .select("*")
      .eq("section_id", section.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const imageRows: GalleryImageRow[] = [];

    if (images && !imagesError) {
      for (const img of images) {
        const { data: uploader } = await admin
          .from("profiles")
          .select("first_name, second_name")
          .eq("id", img.uploaded_by)
          .single();

        const uploaderName = uploader
          ? [uploader.first_name, uploader.second_name].filter(Boolean).join(" ")
          : "";

        const { data: { publicUrl } } = admin.storage
          .from("unit_gallery")
          .getPublicUrl(img.storage_path);

        imageRows.push({
          ...img,
          public_url: publicUrl,
          uploader_name: uploaderName,
        });
      }
    }

    sectionsWithImages.push({
      ...section,
      images: imageRows,
    });
  }

  return sectionsWithImages;
}

export async function createGallerySection(unitId: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "unauthorized" };

  const hasPermission = await checkGalleryPermission(unitId, user.id);
  if (!hasPermission) return { success: false as const, error: "unauthorized" };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("unit_gallery_sections")
    .select("sort_order")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0;

  const { error, data } = await admin
    .from("unit_gallery_sections")
    .insert({
      unit_id: unitId,
      name: name.trim(),
      created_by: user.id,
      sort_order: nextOrder,
    })
    .select("*")
    .single();

  if (error) return { success: false as const, error: error.message };

  revalidatePath("/", "layout");
  return { success: true as const, section: data as GallerySectionRow };
}

export async function deleteGallerySection(sectionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "unauthorized" };

  const admin = createAdminClient();

  const { data: section } = await admin
    .from("unit_gallery_sections")
    .select("unit_id")
    .eq("id", sectionId)
    .single();

  if (!section) return { success: false as const, error: "not-found" };

  const hasPermission = await checkGalleryPermission(section.unit_id, user.id);
  if (!hasPermission) return { success: false as const, error: "unauthorized" };

  const { data: images } = await admin
    .from("unit_gallery_images")
    .select("storage_path")
    .eq("section_id", sectionId);

  if (images && images.length > 0) {
    const paths = images.map((img) => img.storage_path);
    await admin.storage.from("unit_gallery").remove(paths);
  }

  const { error } = await admin
    .from("unit_gallery_sections")
    .delete()
    .eq("id", sectionId);

  if (error) return { success: false as const, error: error.message };

  revalidatePath("/", "layout");
  return { success: true as const };
}

export async function uploadGalleryImages(unitId: string, sectionId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "unauthorized" };

  const hasPermission = await checkGalleryPermission(unitId, user.id);
  if (!hasPermission) return { success: false as const, error: "unauthorized" };

  const admin = createAdminClient();

  const files: File[] = [];
  for (const [, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) {
      files.push(value);
    }
  }

  if (files.length === 0) return { success: false as const, error: "no-files" };

  const uploaded: GalleryImageRow[] = [];

  for (const file of files) {
    const fileExt = file.name.split(".").pop() ?? "jpg";
    const filePath = `${unitId}/${sectionId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    const { error: uploadError } = await admin.storage
      .from("unit_gallery")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[uploadGalleryImages] Upload error:", JSON.stringify(uploadError));
      continue;
    }

    const { data: { publicUrl } } = admin.storage
      .from("unit_gallery")
      .getPublicUrl(filePath);

    const { data: image, error: insertError } = await admin
      .from("unit_gallery_images")
      .insert({
        section_id: sectionId,
        storage_path: filePath,
        original_name: file.name,
        file_size: file.size,
        content_type: file.type,
        uploaded_by: user.id,
      })
      .select("*")
      .single();

    if (insertError || !image) {
      console.error("[uploadGalleryImages] Insert error:", JSON.stringify(insertError));
      continue;
    }

    const { data: uploader } = await admin
      .from("profiles")
      .select("first_name, second_name")
      .eq("id", user.id)
      .single();

    const uploaderName = uploader
      ? [uploader.first_name, uploader.second_name].filter(Boolean).join(" ")
      : "";

    uploaded.push({
      ...image,
      public_url: publicUrl,
      uploader_name: uploaderName,
    });
  }

  if (uploaded.length === 0) return { success: false as const, error: "upload-failed" };

  revalidatePath("/", "layout");
  return { success: true as const, images: uploaded };
}

export async function deleteGalleryImage(imageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "unauthorized" };

  const admin = createAdminClient();

  const { data: imageData } = await admin
    .from("unit_gallery_images")
    .select("storage_path, section_id")
    .eq("id", imageId)
    .single();

  if (!imageData) return { success: false as const, error: "not-found" };

  const { data: sectionData } = await admin
    .from("unit_gallery_sections")
    .select("unit_id")
    .eq("id", imageData.section_id)
    .single();

  if (!sectionData) return { success: false as const, error: "not-found" };

  const hasPermission = await checkGalleryPermission(sectionData.unit_id, user.id);
  if (!hasPermission) return { success: false as const, error: "unauthorized" };

  await admin.storage.from("unit_gallery").remove([imageData.storage_path]);

  const { error } = await admin
    .from("unit_gallery_images")
    .delete()
    .eq("id", imageId);

  if (error) return { success: false as const, error: error.message };

  revalidatePath("/", "layout");
  return { success: true as const };
}
