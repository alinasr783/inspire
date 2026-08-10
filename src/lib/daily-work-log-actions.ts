"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  DailyWorkLogWithEmployee,
  MonthlyStats,
} from "@/lib/daily-work-log-types";

async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin";
}

export async function addDailyLog(data: {
  log_date: string;
  title: string;
  description?: string;
  hours: number;
  category: string;
  status: string;
  department?: string;
  attachment_paths?: string[];
}): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();

  const { error } = await admin.from("daily_work_logs").insert({
    employee_id: user.id,
    log_date: data.log_date,
    title: data.title,
    description: data.description ?? null,
    hours: data.hours,
    category: data.category,
    status: data.status,
    department: data.department ?? null,
    attachment_paths: data.attachment_paths ?? [],
    created_by: user.id,
  });

  if (error) return { success: false, error: "create-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateDailyLog(
  logId: string,
  data: {
    title?: string;
    description?: string;
    hours?: number;
    category?: string;
    status?: string;
    department?: string;
    attachment_paths?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const adminClient = createAdminClient();
  const isUserAdmin = await isAdmin();

  const { data: existing } = await adminClient
    .from("daily_work_logs")
    .select("employee_id, log_date, created_by")
    .eq("id", logId)
    .single();

  if (!existing) return { success: false, error: "not-found" };

  if (!isUserAdmin && existing.employee_id !== user.id) {
    return { success: false, error: "unauthorized" };
  }

  const today = new Date().toISOString().split("T")[0];
  if (!isUserAdmin && existing.log_date !== today) {
    return { success: false, error: "edit-same-day-only" };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.hours !== undefined) updateData.hours = data.hours;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.department !== undefined) updateData.department = data.department;
  if (data.attachment_paths !== undefined) updateData.attachment_paths = data.attachment_paths;

  const { error } = await adminClient
    .from("daily_work_logs")
    .update(updateData)
    .eq("id", logId);

  if (error) return { success: false, error: "update-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteDailyLog(logId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const adminClient = createAdminClient();
  const isUserAdmin = await isAdmin();

  const { data: existing } = await adminClient
    .from("daily_work_logs")
    .select("employee_id, log_date, attachment_paths")
    .eq("id", logId)
    .single();

  if (!existing) return { success: false, error: "not-found" };

  if (!isUserAdmin && existing.employee_id !== user.id) {
    return { success: false, error: "unauthorized" };
  }

  const today = new Date().toISOString().split("T")[0];
  if (!isUserAdmin && existing.log_date !== today) {
    return { success: false, error: "delete-same-day-only" };
  }

  if (existing.attachment_paths && Array.isArray(existing.attachment_paths) && existing.attachment_paths.length > 0) {
    await adminClient.storage
      .from("work-log-attachments")
      .remove(existing.attachment_paths);
  }

  const { error } = await adminClient
    .from("daily_work_logs")
    .delete()
    .eq("id", logId);

  if (error) return { success: false, error: "delete-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function uploadAttachment(formData: FormData): Promise<{
  success: boolean;
  path?: string;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const file = formData.get("file") as File;
  if (!file) return { success: false, error: "no-file" };

  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "file-too-large" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("work-log-attachments")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) return { success: false, error: "upload-failed" };

  return { success: true, path: fileName };
}

export async function getLogsByMonth(
  year: number,
  month: number,
  employeeFilter?: string
): Promise<DailyWorkLogWithEmployee[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const adminClient = createAdminClient();
  const isUserAdmin = await isAdmin();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  let query = adminClient
    .from("daily_work_logs")
    .select(`
      *,
      employee:profiles!daily_work_logs_employee_id_fkey(id, first_name, second_name, position, avatar_url)
    `)
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (isUserAdmin && employeeFilter) {
    query = query.eq("employee_id", employeeFilter);
  } else if (!isUserAdmin) {
    query = query.eq("employee_id", user.id);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as DailyWorkLogWithEmployee[];
}

export async function getLogsByDate(date: string): Promise<DailyWorkLogWithEmployee[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const adminClient = createAdminClient();
  const isUserAdmin = await isAdmin();

  let query = adminClient
    .from("daily_work_logs")
    .select(`
      *,
      employee:profiles!daily_work_logs_employee_id_fkey(id, first_name, second_name, position, avatar_url)
    `)
    .eq("log_date", date)
    .order("created_at", { ascending: false });

  if (!isUserAdmin) {
    query = query.eq("employee_id", user.id);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as DailyWorkLogWithEmployee[];
}

export async function getMonthlyStats(
  year: number,
  month: number
): Promise<MonthlyStats> {
  const user = await getCurrentUser();
  if (!user) return { totalHours: 0, totalEntries: 0, completionRate: 0 };

  const adminClient = createAdminClient();
  const isUserAdmin = await isAdmin();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  let query = adminClient
    .from("daily_work_logs")
    .select("hours, status")
    .gte("log_date", startDate)
    .lte("log_date", endDate);

  if (!isUserAdmin) {
    query = query.eq("employee_id", user.id);
  }

  const { data, error } = await query;
  if (error || !data) return { totalHours: 0, totalEntries: 0, completionRate: 0 };

  const records = data as { hours: number; status: string }[];
  const totalHours = records.reduce((sum, r) => sum + (r.hours || 0), 0);
  const totalEntries = records.length;
  const completed = records.filter((r) => r.status === "مكتملة").length;
  const completionRate = totalEntries > 0 ? Math.round((completed / totalEntries) * 100) : 0;

  return { totalHours, totalEntries, completionRate };
}

export async function getEmployees(): Promise<{
  id: string;
  first_name: string;
  second_name: string;
  avatar_url: string | null;
  position: string;
}[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("profiles")
    .select("id, first_name, second_name, avatar_url, position")
    .eq("approval_status", "approved")
    .order("first_name", { ascending: true });

  return (data ?? []) as {
    id: string;
    first_name: string;
    second_name: string;
    avatar_url: string | null;
    position: string;
  }[];
}
