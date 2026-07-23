"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, AlertTriangle, CheckCircle2, Users } from "lucide-react";
import type { OverviewStats as Stats } from "@/lib/task-types";

const statConfig = [
  { key: "activeTasks" as const, icon: ListChecks, color: "text-sky-600 dark:text-sky-400" },
  { key: "overdue" as const, icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400" },
  { key: "completedToday" as const, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
  { key: "employeesAvailable" as const, icon: Users, color: "text-purple-600 dark:text-purple-400" },
];

export function OverviewStats({ stats }: { stats: Stats }) {
  const t = useTranslations("Tasks");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statConfig.map(({ key, icon: Icon, color }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t(key)}</CardTitle>
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
