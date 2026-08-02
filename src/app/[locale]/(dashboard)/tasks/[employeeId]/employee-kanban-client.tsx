"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { AddTaskDialog } from "@/components/tasks/add-task-dialog";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import type { TaskRow } from "@/lib/task-types";
import { Plus } from "lucide-react";

export function EmployeeKanbanClient({
  initialTasks,
  employeeId,
  employeesList,
}: {
  initialTasks: TaskRow[];
  employeeId: string;
  employeesList: { id: string; name: string }[];
}) {
  const t = useTranslations("Tasks");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: liveTasks } = useRealtimeSync<TaskRow>("tasks");
  const employeeTasks = (liveTasks.length > 0 ? liveTasks : initialTasks).filter(
    (t) => t.assigned_to === employeeId
  );

  const handleOpenDetail = useCallback((taskId: string) => {
    setDetailTaskId(taskId);
    setDetailOpen(true);
  }, []);

  const handleRefetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("tasksCount", { count: employeeTasks.length })}
        </p>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="me-2 size-3.5" />
          {t("newTask")}
        </Button>
      </div>

      <TaskKanban
        key={refreshKey}
        tasks={employeeTasks}
        isAdmin={true}
        onOpenDetail={handleOpenDetail}
      />

      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        employees={employeesList}
        preselectedEmployeeId={employeeId}
      />

      <TaskDetailSheet
        taskId={detailTaskId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isAdmin={true}
        onDeleted={handleRefetch}
        onUpdated={handleRefetch}
      />
    </div>
  );
}
