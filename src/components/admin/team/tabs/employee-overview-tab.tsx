"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Building2,
  CalendarCheck,
  ListChecks,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarDays,
  TrendingUp,
  Banknote,
  Timer,
} from "lucide-react";
import type { TeamMemberProfile } from "@/lib/team-actions";

export function EmployeeOverviewTab({ profile }: { profile: TeamMemberProfile }) {
  const t = useTranslations("Team");

  const stats = [
    { label: t("totalClients"), value: profile.clients_count, icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: t("totalProperties"), value: profile.properties_count, icon: Building2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: t("totalVisits"), value: profile.visits_count, icon: CalendarCheck, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
    { label: t("totalDeals"), value: profile.deals_count, icon: Banknote, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
    { label: t("attendanceRate"), value: `${profile.attendance_rate}%`, icon: CalendarDays, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
    { label: t("totalHours"), value: `${profile.total_hours}`, icon: Timer, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  ];

  const taskStats = [
    { label: t("tasksDone"), value: profile.tasks_done, color: "bg-green-500", icon: CheckCircle2 },
    { label: t("tasksInProgress"), value: profile.tasks_in_progress, color: "bg-blue-500", icon: Clock },
    { label: t("tasksTodo"), value: profile.tasks_todo, color: "bg-gray-400", icon: ListChecks },
    { label: t("tasksOverdue"), value: profile.tasks_overdue, color: "bg-red-500", icon: AlertTriangle },
  ];

  const totalTasks = profile.tasks_done + profile.tasks_in_progress + profile.tasks_todo;
  const completionRate = totalTasks > 0 ? Math.round((profile.tasks_done / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t("tasksStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("tasksDone")}</span>
              <span className="text-sm font-medium">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />

            <div className="grid grid-cols-4 gap-2 pt-2 pb-2">
              {taskStats.map((ts) => {
                const Icon = ts.icon;
                return (
                  <div key={ts.label} className="flex flex-col items-center rounded-lg border p-3">
                    <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${ts.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-lg font-bold">{ts.value}</span>
                    <span className="text-[10px] text-muted-foreground text-center">{ts.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              {t("dealsTab")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{profile.deals_count}</p>
              <p className="text-[11px] text-muted-foreground">{t("totalDeals")}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("totalCommission")}</span>
                <span className="text-lg font-bold text-primary">{profile.total_commission.toLocaleString()} ج.م</span>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">صافي ربح الشركة</span>
                <span className="text-lg font-bold text-emerald-600">{profile.total_company_profit.toLocaleString()} ج.م</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
