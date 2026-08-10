"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, ListChecks, Clock, CheckCircle2 } from "lucide-react";
import { useEmployeeTasksQuery } from "@/hooks/queries/use-team-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { MemberTask } from "@/lib/team-actions";

const statusLabels: Record<string, { label: string; color: string }> = {
  todo: { label: "To Do", color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
  in_progress: { label: "In Progress", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  done: { label: "Done", color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
};

export function EmployeeTasksTab({ employeeId }: { employeeId: string }) {
  const t = useTranslations("Team");
  const { data: tasks, isLoading } = useEmployeeTasksQuery(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const todoTasks = (tasks ?? []).filter((t) => t.status === "todo");
  const inProgressTasks = (tasks ?? []).filter((t) => t.status === "in_progress");
  const doneTasks = (tasks ?? []).filter((t) => t.status === "done");

  const columns = [
    { title: t("tasksTodo"), tasks: todoTasks, icon: ListChecks, color: "text-gray-500" },
    { title: t("tasksInProgress"), tasks: inProgressTasks, icon: Clock, color: "text-blue-500" },
    { title: t("tasksDone"), tasks: doneTasks, icon: CheckCircle2, color: "text-green-500" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {columns.map((col) => {
        const Icon = col.icon;
        return (
          <Card key={col.title} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className={`h-4 w-4 ${col.color}`} />
                {col.title}
                <Badge variant="secondary" className="ms-auto h-5 min-w-5 rounded-full px-1 text-[11px]">
                  {col.tasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 pb-6">
              {col.tasks.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">{t("noTasks")}</p>
              ) : (
                col.tasks.map((task) => (
                  <Card key={task.id} className="p-3 transition-colors hover:bg-muted/30">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={task.progress} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground">{task.progress}%</span>
                    </div>
                    {task.target != null && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {task.progress} / {task.target}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", statusLabels[task.status]?.color)}>
                        {statusLabels[task.status]?.label ?? task.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(task.due_date), "MMM dd")}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
