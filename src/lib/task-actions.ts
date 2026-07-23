"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  combineEmployeesWithTasks,
  getEmployeeDisplayName,
  calculateOverviewStats,
} from "@/lib/task-types";
import type { EmployeeRow } from "@/lib/task-types";

export async function fetchEmployeesAndTasks() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) return null;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, second_name, email, position")
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

export async function fetchEmployeeWithTasks(employeeId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, first_name, second_name, email, position")
    .eq("id", employeeId)
    .single();

  if (!profile) return null;

  const { data: tasks } = await admin
    .from("tasks")
    .select("*")
    .eq("assigned_to", employeeId)
    .order("created_at", { ascending: false });

  return {
    employee: {
      id: profile.id,
      name: getEmployeeDisplayName(profile),
      position: profile.position ?? "",
      tasks: tasks ?? [],
    },
  };
}

const taskSchema = z.object({
  title: z.string().trim().min(1, "title-required"),
  progress: z.coerce.number().min(0).max(100).default(0),
  status: z.enum(["active", "overdue", "completed"]).default("active"),
  due_date: z.string().trim().min(1, "due-date-required"),
  assigned_to: z.string().trim().min(1, "assigned-to-required"),
});

export async function createTask(formData: FormData) {
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user || userError) redirect(`/${locale}/auth/login`);

  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    progress: formData.get("progress"),
    status: formData.get("status"),
    due_date: formData.get("due_date"),
    assigned_to: formData.get("assigned_to"),
  });

  if (!parsed.success) {
    redirect(`/${locale}/tasks?error=validation`);
  }

  const { error } = await supabase.from("tasks").insert({
    ...parsed.data,
    created_by: user.id,
  });

  if (error) {
    redirect(`/${locale}/tasks?error=create-failed`);
  }

  redirect(`/${locale}/tasks`);
}

export async function updateTaskProgress(taskId: string, progress: number) {
  const locale = await getLocale();
  const admin = createAdminClient();

  const { error } = await admin
    .from("tasks")
    .update({ progress, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) {
    redirect(`/${locale}/tasks?error=update-failed`);
  }
}
