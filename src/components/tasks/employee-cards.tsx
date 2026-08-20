"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronRight,
  Users,
  AlertTriangle,
  Plus,
  Play,
} from "lucide-react";
import { getRelativeDate } from "@/lib/relative-date";
import type { EmployeeWithTasks, TaskRow } from "@/lib/task-types";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : parts[0]?.slice(0, 2) ?? "??";
}

function InProgressTaskCard({
  task,
  locale,
  onOpen,
}: {
  task: TaskRow;
  locale: string;
  onOpen: () => void;
}) {
  const t = useTranslations("Tasks");
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border bg-muted/30 p-3 text-start transition-colors hover:bg-muted/60"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium">{task.title}</span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
          {task.progress}%
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(task.progress, 100)}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
        <Play className="size-3" />
        <span>{t("columnInProgress")}</span>
        <span className="ms-auto">{getRelativeDate(new Date(task.due_date), locale)}</span>
      </div>
    </button>
  );
}

export function EmployeeCards({
  employees,
  onAddTask,
  onOpenTask,
}: {
  employees: EmployeeWithTasks[];
  onAddTask: (employeeId: string) => void;
  onOpenTask?: (taskId: string) => void;
}) {
  const t = useTranslations("Tasks");
  const locale = useLocale();

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">{t("noEmployees")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {employees.map((emp) => {
        const todoCount = emp.tasks.filter((t) => t.status === "todo").length;
        const inProgressCount = emp.tasks.filter((t) => t.status === "in_progress").length;
        const inProgressTasks = emp.tasks.filter((t) => t.status === "in_progress");
        const doneCount = emp.tasks.filter((t) => t.status === "done").length;

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const overdueCount = emp.tasks.filter((t) => {
          if (t.status === "done") return false;
          const due = new Date(t.due_date);
          due.setHours(0, 0, 0, 0);
          return due.getTime() < now.getTime();
        }).length;

        return (
          <Card key={emp.id} className="flex flex-col overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Avatar size="lg" className="shrink-0">
                  <AvatarImage src={emp.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {getInitials(emp.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{emp.name}</p>
                  {emp.position && (
                    <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1.5">
                <div className="rounded-lg bg-muted/60 px-2 py-1.5 text-center">
                  <p className="text-sm font-bold">{emp.tasks.length}</p>
                  <p className="text-[10px] text-muted-foreground">{t("totalTasks")}</p>
                </div>
                <div className="rounded-lg bg-blue-50 px-2 py-1.5 text-center dark:bg-blue-950/30">
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{todoCount}</p>
                  <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">{t("columnTodo")}</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-2 py-1.5 text-center dark:bg-amber-950/30">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{inProgressCount}</p>
                  <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">{t("columnInProgress")}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-center dark:bg-emerald-950/30">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{doneCount}</p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">{t("columnDone")}</p>
                </div>
              </div>

              {overdueCount > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 dark:bg-red-950/30">
                  <AlertTriangle className="size-3 text-red-600" />
                  <span className="text-[11px] font-medium text-red-700 dark:text-red-300">
                    {t("overdueCount", { count: overdueCount })}
                  </span>
                </div>
              )}

              {onOpenTask && inProgressTasks.length > 0 && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  {inProgressTasks.map((task) => (
                    <InProgressTaskCard
                      key={task.id}
                      task={task}
                      locale={locale}
                      onOpen={() => onOpenTask(task.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-auto flex border-t">
              <Link
                href={`/tasks/${emp.id}`}
                className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {t("viewTasks")}
                <ChevronRight className="size-3.5" />
              </Link>
              <button
                onClick={() => onAddTask(emp.id)}
                className="flex flex-1 items-center justify-center gap-1.5 border-l py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <Plus className="size-3.5" />
                {t("addTask")}
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
