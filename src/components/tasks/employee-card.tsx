"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";
import { getRelativeDate } from "@/lib/relative-date";
import type { EmployeeWithTasks, TaskRow } from "@/lib/task-types";

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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : parts[0]?.slice(0, 2) ?? "??";
}

function TaskRow({ task, locale }: { task: TaskRow; locale: string }) {
  const t = useTranslations("Tasks");

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <span className="truncate text-sm font-medium">{task.title}</span>
        <Badge
          variant={statusVariants[task.status]}
          className={`shrink-0 ${statusBadgeColors[task.status]}`}
        >
          {t(`status_${task.status}`)}
        </Badge>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="rounded-full bg-primary transition-all"
          style={{ width: `${task.progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{task.progress}%</span>
        <span>{getRelativeDate(new Date(task.due_date), locale)}</span>
      </div>
    </div>
  );
}

export function EmployeeCard({ employee }: { employee: EmployeeWithTasks }) {
  const locale = useLocale();
  const t = useTranslations("Tasks");

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center gap-3">
        <Avatar size="lg" className="shrink-0">
          <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{employee.name}</div>
          <div className="truncate text-sm text-muted-foreground">
            {employee.position}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {employee.tasks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <ClipboardList className="h-8 w-8 opacity-40" />
            <span>{t("noTasks")}</span>
          </div>
        ) : (
          <div className="flex-1 space-y-3">
            {employee.tasks.map((task) => (
              <TaskRow key={task.id} task={task} locale={locale} />
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Link href={`/tasks/${employee.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              {t("details")}
            </Button>
          </Link>
          <Button size="sm" className="flex-1">
            <Plus className="h-4 w-4" />
            {t("addTask")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
