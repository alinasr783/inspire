"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface Folder {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  files: FileItem[];
}

export interface FileItem {
  id: string;
  folder_id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export async function getFolders(): Promise<Folder[]> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  // جلب كل المجلدات والملفات عبر pagination حتى لا تُقطع عند حد PostgREST الافتراضي
  const PAGE_SIZE = 1000;
  const allFoldersRaw: Record<string, unknown>[] = [];
  for (let page = 0; page < 100; page++) {
    const { data: folders, error: foldersError } = await admin
      .from("unconfirmed_folders")
      .select("*")
      .order("name", { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (foldersError) throw new Error("folders-fetch-failed");
    if (!folders || folders.length === 0) break;
    allFoldersRaw.push(...(folders as Record<string, unknown>[]));
    if (folders.length < PAGE_SIZE) break;
  }
  const folders = allFoldersRaw as unknown as { id: string; name: string; created_by: string; created_at: string }[];

  const allFilesRaw: Record<string, unknown>[] = [];
  for (let page = 0; page < 100; page++) {
    const { data: files, error: filesError } = await admin
      .from("unconfirmed_files")
      .select("*")
      .order("name", { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (filesError) throw new Error("files-fetch-failed");
    if (!files || files.length === 0) break;
    allFilesRaw.push(...(files as Record<string, unknown>[]));
    if (files.length < PAGE_SIZE) break;
  }
  const files = allFilesRaw as unknown as FileItem[];

  const filesByFolder = new Map<string, FileItem[]>();
  for (const f of files ?? []) {
    if (!filesByFolder.has(f.folder_id)) filesByFolder.set(f.folder_id, []);
    filesByFolder.get(f.folder_id)!.push(f);
  }

  return (folders ?? []).map((folder) => ({
    ...folder,
    files: filesByFolder.get(folder.id) ?? [],
  }));
}

export async function createFolder(name: string): Promise<Folder> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  const { data: folder, error } = await admin
    .from("unconfirmed_folders")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (error || !folder) throw new Error("folder-create-failed");
  return { ...folder, files: [] };
}

export async function createFile(folderId: string, name: string): Promise<FileItem> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();

  const { data: file, error } = await admin
    .from("unconfirmed_files")
    .insert({ folder_id: folderId, name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (error || !file) throw new Error("file-create-failed");
  return file;
}

export async function deleteFolder(id: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();
  const { error } = await admin.from("unconfirmed_folders").delete().eq("id", id);
  if (error) throw new Error("folder-delete-failed");
}

export async function deleteFile(id: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();
  const { error } = await admin.from("unconfirmed_files").delete().eq("id", id);
  if (error) throw new Error("file-delete-failed");
}

export async function renameFolder(id: string, name: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();
  const { error } = await admin.from("unconfirmed_folders").update({ name: name.trim() }).eq("id", id);
  if (error) throw new Error("folder-rename-failed");
}

export async function renameFile(id: string, name: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) throw new Error("unauthorized");

  const admin = createAdminClient();
  const { error } = await admin.from("unconfirmed_files").update({ name: name.trim() }).eq("id", id);
  if (error) throw new Error("file-rename-failed");
}
