"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { OverviewStats } from "@/components/tasks/overview-stats";
import { EmployeeCard } from "@/components/tasks/employee-card";
import { TaskSearch } from "@/components/tasks/task-search";
import { Button } from "@/components/ui/button";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import {
  combineEmployeesWithTasks,
  calculateOverviewStats,
} from "@/lib/task-types";
import type { EmployeeWithTasks, OverviewStats as Stats, EmployeeRow, TaskRow } from "@/lib/task-types";

type FilterKey = "all" | "active" | "overdue" | "completed";

const filters: { key: FilterKey; labelKey: string }[] = [
  { key: "all", labelKey: "filterAll" },
  { key: "active", labelKey: "filterActive" },
  { key: "overdue", labelKey: "filterOverdue" },
  { key: "completed", labelKey: "filterCompleted" },
];

export function TasksClient({
  initialEmployees,
  initialStats,
  tasksRaw,
  employeesRaw,
}: {
  initialEmployees: EmployeeWithTasks[];
  initialStats: Stats;
  tasksRaw: TaskRow[];
  employeesRaw: EmployeeRow[];
}) {
  const t = useTranslations("Tasks");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterKey>("all");

  const { data: liveTasks, setInitialData } = useRealtimeSync<TaskRow>("tasks");

  useEffect(() => {
    setInitialData(tasksRaw);
  }, [tasksRaw, setInitialData]);

  const currentTasks = liveTasks.length > 0 ? liveTasks : tasksRaw;

  const { employees, stats } = useMemo(() => {
    const combined = combineEmployeesWithTasks(employeesRaw, currentTasks);
    const s = calculateOverviewStats(combined);
    return { employees: combined, stats: s };
  }, [employeesRaw, currentTasks]);

  const filtered = useMemo(() => {
    let result = employees;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (emp) =>
          emp.name.toLowerCase().includes(q) ||
          emp.position.toLowerCase().includes(q) ||
          emp.tasks.some((task) => task.title.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((emp) =>
        emp.tasks.some((task) => task.status === statusFilter)
      );
    }

    return result;
  }, [searchQuery, statusFilter, employees]);

  const displayStats = stats.activeTasks > 0 || stats.overdue > 0 ? stats : initialStats;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <OverviewStats stats={displayStats} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TaskSearch value={searchQuery} onChange={setSearchQuery} />
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("filterByEmployee")}>
          {filters.map(({ key, labelKey }) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "secondary"}
              size="sm"
              onClick={() => setStatusFilter(key)}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((emp) => (
          <EmployeeCard key={emp.id} employee={emp} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t("noTasks")}
        </p>
      )}
    </div>
  );
}
