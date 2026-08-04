import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmployeeKanbanClient } from "./employee-kanban-client";
import { fetchEmployeeWithTasks } from "@/lib/task-actions";
import type { TaskRow } from "@/lib/task-types";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; employeeId: string }>;
}) {
  const { locale, employeeId } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: me } = await admin
    .from("profiles").select("role").eq("id", user.id).single();
  const isOwnProfile = user.id === employeeId;
  if (me?.role !== "admin" && !isOwnProfile) notFound();

  const result = await fetchEmployeeWithTasks(employeeId);
  if (!result) notFound();

  let tasks: TaskRow[];
  if ("tasks" in result) {
    tasks = (result as { tasks: TaskRow[] }).tasks;
  } else {
    tasks = [];
  }

  const { employee } = result as { employee: { id: string; name: string; position: string; avatar_url: string | null } };
  const employeeAvatarUrl = employee.avatar_url;

  // Fetch all employees for add-task dialog
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, second_name, position")
    .eq("approval_status", "approved")
    .order("first_name", { ascending: true });
  const employeesList = (profiles ?? []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    name: [e.first_name, e.second_name].filter(Boolean).join(" ") || (e.id as string),
  }));

  const t = await getTranslations("Tasks");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tasks">
            <Button variant="ghost" size="icon" aria-label={t("backToTasks")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Avatar size="default" className="shrink-0">
            <AvatarImage src={employeeAvatarUrl ?? undefined} />
            <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
              {employee.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{employee.name}</h1>
            <p className="text-sm text-muted-foreground">{employee.position}</p>
          </div>
        </div>
        <Link href="/tasks">
          <Button variant="outline" size="sm">{t("backToTasks")}</Button>
        </Link>
      </div>

      <EmployeeKanbanClient
        initialTasks={tasks}
        employeeId={employeeId}
        employeesList={employeesList}
      />
    </div>
  );
}
