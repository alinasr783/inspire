"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { combineEmployeesWithTasks, calculateOverviewStats } from "@/lib/task-types";
import type { TaskStatus } from "@/lib/task-types";

export type ActionResult = { success: true } | { success: false; error: string };

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

// ── fetch for admin ──
export async function fetchEmployeesAndTasks() {
  const user = await getCurrentUser();
  if (!user) return null;

  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, second_name, email, position, avatar_url")
    .eq("approval_status", "approved")
    .order("first_name", { ascending: true });

  const { data: tasks } = await admin
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  const employeeList = combineEmployeesWithTasks(profiles ?? [], tasks ?? []);
  const stats = calculateOverviewStats(employeeList);

  return { employees: employeeList, stats };
}

// ── fetch current user's own tasks (employee view) ──
export async function fetchMyTasks() {
  const user = await getCurrentUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: tasks } = await admin
    .from("tasks")
    .select("*")
    .eq("assigned_to", user.id)
    .order("created_at", { ascending: false });

  return (tasks ?? []) as import("@/lib/task-types").TaskRow[];
}

// ── fetch single employee's tasks (admin drilling in) ──
export async function fetchEmployeeTasks(employeeId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!(await isAdmin())) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, first_name, second_name, position, avatar_url")
    .eq("id", employeeId)
    .single();

  if (!profile) return null;

  const { data: tasks } = await admin
    .from("tasks")
    .select("*")
    .eq("assigned_to", employeeId)
    .order("due_date", { ascending: true });

  return {
    employee: {
      id: profile.id,
      name: [profile.first_name, profile.second_name].filter(Boolean).join(" "),
      position: profile.position ?? "",
      avatar_url: profile.avatar_url ?? null,
    },
    tasks: (tasks ?? []) as import("@/lib/task-types").TaskRow[],
  };
}

// ── create task (admin only) ──
export async function createTask(data: {
  title: string;
  description?: string;
  progress?: number;
  target?: number;
  status?: TaskStatus;
  due_date: string;
  assigned_to: string;
  task_type?: string | null;
  folder_id?: string | null;
  file_id?: string | null;
  records_target?: number | null;
}): Promise<ActionResult & { taskId?: string }> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };

  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();

  const insertData: Record<string, unknown> = {
    title: data.title,
    description: data.description ?? null,
    progress: data.progress ?? 0,
    target: data.target ?? null,
    status: data.status ?? "todo",
    due_date: data.due_date,
    assigned_to: data.assigned_to,
    created_by: user.id,
    task_type: data.task_type ?? null,
    folder_id: data.folder_id ?? null,
    file_id: data.file_id ?? null,
    records_target: data.records_target ?? null,
  };

  const { data: newTask, error } = await admin.from("tasks").insert(insertData).select("id").single();

  if (error || !newTask) return { success: false, error: "create-failed" };

  revalidatePath("/", "layout");
  return { success: true, taskId: newTask.id };
}

// ── update task status (employee drags to new column, or admin changes) ──
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();

  const isUserAdmin = await isAdmin();
  if (!isUserAdmin) {
    // Employee: only own tasks, only status change
    const { data: task } = await admin
      .from("tasks")
      .select("assigned_to")
      .eq("id", taskId)
      .single();
    if (!task || task.assigned_to !== user.id) return { success: false, error: "unauthorized" };
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "done") {
    updateData.progress = 100;
  }

  const { error } = await admin
    .from("tasks")
    .update(updateData)
    .eq("id", taskId);

  if (error) return { success: false, error: "update-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

// ── update task (admin only, full edit) ──
export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    progress?: number;
    target?: number;
    status?: TaskStatus;
    due_date?: string;
    assigned_to?: string;
  }
): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.progress !== undefined) updateData.progress = data.progress;
  if (data.target !== undefined) updateData.target = data.target;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.due_date !== undefined) updateData.due_date = data.due_date;
  if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to;

  const { error } = await admin.from("tasks").update(updateData).eq("id", taskId);
  if (error) return { success: false, error: "update-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

// ── delete task (admin only) ──
export async function deleteTask(taskId: string): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { error } = await admin.from("tasks").delete().eq("id", taskId);
  if (error) return { success: false, error: "delete-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

// ── update task progress (employee updates their own task progress) ──
export async function updateTaskProgress(
  taskId: string,
  progress: number
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthorized" };

  const admin = createAdminClient();
  const { data: task } = await admin
    .from("tasks")
    .select("assigned_to")
    .eq("id", taskId)
    .single();

  if (!task || task.assigned_to !== user.id) {
    if (!(await isAdmin())) return { success: false, error: "unauthorized" };
  }

  const { error } = await admin
    .from("tasks")
    .update({ progress, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) return { success: false, error: "update-failed" };
  revalidatePath("/", "layout");
  return { success: true };
}

// ── fetch single task for detail sheet ──
export async function fetchTask(taskId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const admin = createAdminClient();

  if (await isAdmin()) {
    const { data } = await admin.from("tasks").select("*").eq("id", taskId).single();
    return (data as import("@/lib/task-types").TaskRow) ?? null;
  }

  // Employee: only own tasks
  const { data } = await admin
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("assigned_to", user.id)
    .single();

  return (data as import("@/lib/task-types").TaskRow) ?? null;
}

// ── legacy redirect-based create (keeping for compat) ──
export async function createTaskLegacy(formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const result = await createTask({
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) ?? "",
    target: formData.get("target") ? Number(formData.get("target")) : undefined,
    due_date: (formData.get("due_date") as string) ?? "",
    assigned_to: (formData.get("assigned_to") as string) ?? "",
    status: (formData.get("status") as TaskStatus) ?? "todo",
  });

  if (!result.success) redirect(`/${locale}/tasks?error=${result.error}`);
  redirect(`/${locale}/tasks`);
}

// ── legacy progress update (keeping for compat) ──
export async function updateTaskProgressLegacy(taskId: string, progress: number) {
  const locale = await getLocale();
  const result = await updateTaskProgress(taskId, progress);
  if (!result.success) redirect(`/${locale}/tasks?error=${result.error}`);
}

// ── legacy employee fetch (keeping for compat with existing page) ──
export async function fetchEmployeeWithTasks(employeeId: string) {
  return fetchEmployeeTasks(employeeId);
}

export async function getTaskConfirmationProgress(taskId: string): Promise<{ confirmed: number; target: number }> {
  const admin = createAdminClient();

  const { data: task } = await admin
    .from("tasks")
    .select("records_target, file_id, assigned_to")
    .eq("id", taskId)
    .single();

  const target = task?.records_target ?? 0;
  if (!task?.file_id || target === 0) return { confirmed: 0, target: 0 };

  const { count } = await admin
    .from("unconfirmed_records")
    .select("*", { count: "exact", head: true })
    .eq("file_id", task.file_id)
    .eq("assigned_employee", task.assigned_to);

  return { confirmed: count ?? 0, target };
}

export async function syncTaskConfirmationProgress(taskId: string): Promise<{ progress: number; done: boolean }> {
  const admin = createAdminClient();

  const { data: task } = await admin
    .from("tasks")
    .select("records_target, task_type, status, file_id, assigned_to, target")
    .eq("id", taskId)
    .single();

  if (!task || task.task_type !== "confirmation") return { progress: 0, done: false };
  if (task.status === "done") return { progress: 100, done: true };

  const target = task.records_target ?? 0;
  if (!task.file_id || target === 0) return { progress: 0, done: false };

  const { count } = await admin
    .from("unconfirmed_records")
    .select("*", { count: "exact", head: true })
    .eq("file_id", task.file_id)
    .eq("assigned_employee", task.assigned_to);

  const confirmed = count ?? 0;
  const progress = Math.min(100, Math.round((confirmed / target) * 100));
  const done = progress >= 100;

  await admin.from("tasks").update({
    progress,
    target,
    status: done ? "done" : statusForProgress(task.status as string, progress),
    updated_at: new Date().toISOString(),
  }).eq("id", taskId);

  return { progress, done };
}

function statusForProgress(current: string, progress: number): string {
  if (progress >= 100) return "done";
  if (progress > 0) return "in_progress";
  return current === "done" ? "in_progress" : current;
}
