import { setRequestLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchEmployeesAndTasks } from "@/lib/task-actions";
import { TasksClient } from "./tasks-client";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const data = await fetchEmployeesAndTasks();

  return <TasksClient employees={data?.employees ?? []} stats={data?.stats ?? {
    activeTasks: 0,
    overdue: 0,
    completedToday: 0,
    employeesAvailable: 0,
  }} />;
}
