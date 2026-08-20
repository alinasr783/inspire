import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TasksClient } from "./tasks-client";
import { combineEmployeesWithTasks, type TaskRow, type EmployeeRow } from "@/lib/task-types";
import { fetchConfirmationOverview } from "@/lib/task-actions";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: me } = user
    ? await admin.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const isAdmin = me?.role === "admin";

  // Fetch all approved employees (for admin view, or employees list for add-task dialog)
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, second_name, position, avatar_url")
    .eq("approval_status", "approved")
    .order("first_name", { ascending: true });

  const employeesList = (profiles ?? []) as EmployeeRow[];

  // Fetch tasks based on role
  let tasks: TaskRow[];

  if (isAdmin) {
    const { data } = await admin
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true });
    tasks = (data ?? []) as unknown as TaskRow[];
  } else {
    const { data } = await admin
      .from("tasks")
      .select("*")
      .eq("assigned_to", user!.id)
      .order("due_date", { ascending: true });
    tasks = (data ?? []) as unknown as TaskRow[];
  }

  const employees = combineEmployeesWithTasks(employeesList, tasks);

  const confirmation = isAdmin ? await fetchConfirmationOverview() : null;
  const employeeNames: Record<string, string> = Object.fromEntries(
    (profiles ?? []).map((e) => [e.id, [e.first_name, e.second_name].filter(Boolean).join(" ") || e.id])
  );

  return (
    <TasksClient
      isAdmin={isAdmin}
      initialTasks={tasks}
      initialEmployees={employees}
      employeesList={employeesList.map((e) => ({
        id: e.id,
        name: [e.first_name, e.second_name].filter(Boolean).join(" ") || e.id,
      }))}
      userId={user?.id ?? ""}
      confirmationFolders={confirmation?.folders ?? []}
      confirmationTasks={confirmation?.tasks ?? []}
      employeeNames={employeeNames}
    />
  );
}
