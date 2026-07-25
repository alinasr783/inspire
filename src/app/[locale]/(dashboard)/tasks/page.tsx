import { setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { combineEmployeesWithTasks, calculateOverviewStats } from "@/lib/task-types";
import type { EmployeeRow, TaskRow } from "@/lib/task-types";
import { TasksClient } from "./tasks-client";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, second_name, email, position")
    .eq("approval_status", "approved")
    .order("first_name", { ascending: true });

  const { data: tasks } = await admin
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  const employeesRaw = (profiles ?? []) as EmployeeRow[];
  const tasksRaw = (tasks ?? []) as TaskRow[];

  const employeeList = combineEmployeesWithTasks(employeesRaw, tasksRaw);
  const stats = calculateOverviewStats(employeeList);

  return (
    <TasksClient
      initialEmployees={employeeList}
      initialStats={stats}
      tasksRaw={tasksRaw}
      employeesRaw={employeesRaw}
    />
  );
}
