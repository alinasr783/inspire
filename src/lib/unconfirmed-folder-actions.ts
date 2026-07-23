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

  const { data: folders, error: foldersError } = await admin
    .from("unconfirmed_folders")
    .select("*")
    .order("name", { ascending: true });

  if (foldersError) throw new Error("folders-fetch-failed");

  const { data: files, error: filesError } = await admin
    .from("unconfirmed_files")
    .select("*")
    .order("name", { ascending: true });

  if (filesError) throw new Error("files-fetch-failed");

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
