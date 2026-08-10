"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, Users, Clock, BarChart3 } from "lucide-react";
import type { AttendanceStats as AttendanceStatsType } from "@/lib/attendance-actions";

interface AttendanceStatsProps {
  stats: AttendanceStatsType;
}

export function AttendanceStats({ stats }: AttendanceStatsProps) {
  const t = useTranslations("Attendance");

  if (stats && !Array.isArray(stats) && "totalEmployees" in stats && "employeeStats" in stats) {
    const adminStats = stats as {
      totalEmployees: number;
      workingDays: number;
      totalExpected: number;
      totalActual: number;
      attendanceRate: number;
      employeeStats: {
        employeeId: string;
        employeeName: string;
        position: string;
        daysPresent: number;
        workingDays: number;
        attendanceRate: number;
        avgCheckInTime: string;
      }[];
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {t("totalEmployees")}
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">{adminStats.totalEmployees}</div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              {t("attendanceRate")}
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
              {adminStats.attendanceRate}%
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t("workingDays")}
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">{adminStats.workingDays}</div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              {t("totalCheckIns")}
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-blue-600">
              {adminStats.totalActual}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-foreground/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    {t("employee")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">
                    {t("position")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                    {t("daysPresent")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                    {t("attendanceRate")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hidden sm:table-cell">
                    {t("avgCheckIn")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {adminStats.employeeStats
                  .sort((a, b) => b.attendanceRate - a.attendanceRate)
                  .map((emp) => (
                    <tr
                      key={emp.employeeId}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">{emp.employeeName}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {emp.position || "—"}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        <span className={emp.attendanceRate < 50 ? "text-red-600 font-semibold" : ""}>
                          {emp.daysPresent}/{emp.workingDays}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-2 flex-1 max-w-[80px] rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                emp.attendanceRate >= 80
                                  ? "bg-emerald-500"
                                  : emp.attendanceRate >= 50
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${emp.attendanceRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium tabular-nums w-9">
                            {emp.attendanceRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell font-mono tabular-nums text-muted-foreground">
                        {emp.avgCheckInTime}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (stats && typeof stats === "object" && "daysPresent" in stats) {
    const userStats = stats as {
      daysPresent: number;
      workingDays: number;
      attendanceRate: number;
      avgCheckInTime: string;
    };

    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("daysPresent")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {userStats.daysPresent}/{userStats.workingDays}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("attendanceRate")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
            {userStats.attendanceRate}%
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("avgCheckIn")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight font-mono">
            {userStats.avgCheckInTime}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
