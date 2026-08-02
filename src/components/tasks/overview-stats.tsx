"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, Circle, Play, CheckCircle2 } from "lucide-react";
import type { OverviewStats } from "@/lib/task-types";

const statConfig = [
  { key: "total" as const, icon: ListChecks, color: "text-muted-foreground" },
  { key: "todo" as const, icon: Circle, color: "text-blue-600 dark:text-blue-400" },
  { key: "inProgress" as const, icon: Play, color: "text-amber-600 dark:text-amber-400" },
  { key: "done" as const, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
];

export function OverviewStats({ stats }: { stats: OverviewStats }) {
  const t = useTranslations("Tasks");
  const labels: Record<string, string> = {
    total: t("totalTasks"),
    todo: t("columnTodo"),
    inProgress: t("columnInProgress"),
    done: t("columnDone"),
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {statConfig.map(({ key, icon: Icon, color }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{labels[key]}</CardTitle>
            <Icon className={`h-4 w-4 ${color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats[key]}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
