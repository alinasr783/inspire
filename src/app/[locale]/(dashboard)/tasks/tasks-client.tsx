"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { EmployeeCards } from "@/components/tasks/employee-cards";
import { AdTrackingSection } from "@/components/tasks/ad-tracking-section";
import { TaskConfirmationTracker } from "@/components/tasks/task-confirmation-tracker";
import { AddTaskDialog } from "@/components/tasks/add-task-dialog";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { ConfirmationOverview } from "@/components/tasks/confirmation-overview";
import { combineEmployeesWithTasks, calculateOverviewStats } from "@/lib/task-types";
import type { TaskRow, EmployeeWithTasks, OverviewStats, EmployeeRow } from "@/lib/task-types";
import type { Folder } from "@/lib/unconfirmed-folder-actions";
import { Plus, Users, ListTree } from "lucide-react";

function OverviewStatsBar({ stats }: { stats: OverviewStats; isAdmin: boolean }) {
  const t = useTranslations("Tasks");
  const cards = [
    { label: t("totalTasks"), value: stats.total, color: "#6b7280" },
    { label: t("columnTodo"), value: stats.todo, color: "#3b82f6" },
    { label: t("columnInProgress"), value: stats.inProgress, color: "#f59e0b" },
    { label: t("columnDone"), value: stats.done, color: "#10b981" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border bg-card p-3 text-center shadow-sm ring-1 ring-foreground/5"
        >
          <p className="text-2xl font-bold tracking-tight">{card.value}</p>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

export function TasksClient({
  isAdmin,
  initialTasks,
  initialEmployees,
  employeesList,
  userId,
  confirmationFolders,
  confirmationTasks,
  confirmationFileTotals,
  confirmationTaskConfirmed,
  confirmationFileDone,
  employeeNames,
}: {
  isAdmin: boolean;
  initialTasks: TaskRow[];
  initialEmployees: EmployeeWithTasks[];
  employeesList: { id: string; name: string }[];
  userId: string;
  confirmationFolders: Folder[];
  confirmationTasks: TaskRow[];
  confirmationFileTotals: Record<string, number>;
  confirmationTaskConfirmed: Record<string, number>;
  confirmationFileDone: Record<string, number>;
  employeeNames: Record<string, string>;
}) {
  const t = useTranslations("Tasks");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [preselectedEmployeeId, setPreselectedEmployeeId] = useState<string | undefined>();
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"employees" | "overview">("employees");

  const { data: liveTasks, setInitialData } = useRealtimeSync<TaskRow>("tasks");

  useEffect(() => {
    setInitialData(initialTasks);
  }, [initialTasks, setInitialData]);

  const currentTasks = liveTasks.length > 0 ? liveTasks : initialTasks;

  const { employees, stats: currentStats } = useMemo(() => {
    const employeeRows = initialEmployees.map((e) => ({
      id: e.id,
      first_name: e.name.split(" ")[0] ?? "",
      second_name: e.name.split(" ").slice(1).join(" ") ?? null,
      email: null,
      position: e.position ?? null,
      avatar_url: e.avatarUrl,
    })) as EmployeeRow[];
    const combined = combineEmployeesWithTasks(employeeRows, currentTasks);
    const stats = calculateOverviewStats(combined);
    return { employees: combined, stats };
  }, [currentTasks, initialEmployees]);

  const myTasks = useMemo(
    () => currentTasks.filter((t) => t.assigned_to === userId),
    [currentTasks, userId]
  );

  const handleAddTask = useCallback(
    (employeeId: string) => {
      setPreselectedEmployeeId(employeeId);
      setAddDialogOpen(true);
    },
    []
  );

  const handleOpenDetail = useCallback((taskId: string) => {
    setDetailTaskId(taskId);
    setDetailOpen(true);
  }, []);

  const handleRefetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin ? t("subtitleAdmin") : t("subtitleEmployee")}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setPreselectedEmployeeId(undefined); setAddDialogOpen(true); }}>
            <Plus className="me-2 size-4" />
            {t("newTask")}
          </Button>
        )}
      </div>

      <OverviewStatsBar stats={currentStats} isAdmin={isAdmin} />

      {isAdmin ? (
        <div className="space-y-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("employees")}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (activeTab === "employees"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground")
              }
            >
              <Users className="size-4" />
              {t("employeesTab")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (activeTab === "overview"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground")
              }
            >
              <ListTree className="size-4" />
              {t("overviewTab")}
            </button>
          </div>

          {activeTab === "employees" ? (
            <EmployeeCards employees={employees} onAddTask={handleAddTask} onOpenTask={handleOpenDetail} />
          ) : (
            <ConfirmationOverview
              folders={confirmationFolders}
              tasks={confirmationTasks}
              liveTasks={liveTasks}
              fileTotals={confirmationFileTotals}
              taskConfirmed={confirmationTaskConfirmed}
              fileDone={confirmationFileDone}
              employeeNames={employeeNames}
            />
          )}
        </div>
      ) : (
        <>
          <TaskConfirmationTracker tasks={myTasks} />
          <AdTrackingSection employeeId={userId} />
          <TaskKanban
            key={refreshKey}
            tasks={myTasks}
            isAdmin={false}
            onOpenDetail={handleOpenDetail}
          />
        </>
      )}

      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        employees={employeesList}
        preselectedEmployeeId={preselectedEmployeeId}
      />

      <TaskDetailSheet
        taskId={detailTaskId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isAdmin={isAdmin}
        onDeleted={handleRefetch}
        onUpdated={handleRefetch}
      />
    </div>
  );
}
