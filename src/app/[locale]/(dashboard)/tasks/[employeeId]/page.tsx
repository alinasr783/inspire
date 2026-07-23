import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { fetchEmployeeWithTasks } from "@/lib/task-actions";
import { getRelativeDate } from "@/lib/relative-date";
import type { TaskRow } from "@/lib/task-types";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : parts[0]?.slice(0, 2) ?? "??";
}

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  overdue: "outline",
  completed: "secondary",
};

const statusBadgeColors: Record<string, string> = {
  active: "",
  overdue: "border-amber-500 text-amber-600 dark:text-amber-400",
  completed: "",
};

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; employeeId: string }>;
}) {
  const { locale, employeeId } = await params;
  setRequestLocale(locale);

  const result = await fetchEmployeeWithTasks(employeeId);
  if (!result) notFound();

  const { employee } = result;
  const t = await getTranslations("Tasks");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tasks">
          <Button variant="ghost" size="icon" aria-label={t("backToTasks")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("employeeDetails", { name: employee.name })}
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar size="lg" className="shrink-0">
            <AvatarFallback className="text-lg">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{employee.name}</CardTitle>
            <p className="truncate text-sm text-muted-foreground">
              {employee.position}
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {employee.tasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("noTasks")}
            </p>
          ) : (
            <div className="space-y-4">
              {employee.tasks.map((task: TaskRow) => (
                <div key={task.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-start justify-between gap-2 min-w-0">
                    <span className="truncate text-sm font-medium">{task.title}</span>
                    <Badge
                      variant={statusVariants[task.status]}
                      className={`shrink-0 ${statusBadgeColors[task.status]}`}
                    >
                      {t(`status_${task.status}`)}
                    </Badge>
                  </div>
                  <div className="mb-2">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t("progress")}</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="rounded-full bg-primary transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span>{t("dueDate")}: </span>
                    <span>{getRelativeDate(new Date(task.due_date), locale)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
