"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, Timer, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useEmployeeAttendanceQuery,
  useEmployeeWorkLogsQuery,
} from "@/hooks/queries/use-team-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function EmployeeAttendanceTab({ employeeId }: { employeeId: string }) {
  const t = useTranslations("Team");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: attendance, isLoading: attLoading } = useEmployeeAttendanceQuery(employeeId, year, month);
  const { data: workLogs, isLoading: logsLoading } = useEmployeeWorkLogsQuery(employeeId, year, month);

  const monthName = format(new Date(year, month - 1, 1), "MMMM yyyy");

  const totalWorkHours = (workLogs ?? []).reduce((sum, w) => sum + (w.hours ?? 0), 0);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          {monthName}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {t("attendanceHistory")} ({attendance?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !attendance || attendance.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noAttendance")}</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {attendance.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(a.check_in_date), "dd MMM yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.check_in_time}</p>
                      {a.location_name && (
                        <p className="text-xs text-muted-foreground">{a.location_name}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {a.check_in_time?.slice(0, 5)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                {t("workLogs")} ({workLogs?.length ?? 0})
              </div>
              <Badge variant="secondary" className="text-[11px]">
                {totalWorkHours.toFixed(1)}h
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !workLogs || workLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noWorkLogs")}</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {workLogs.map((w) => (
                  <div key={w.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{w.title}</p>
                        {w.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{w.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {w.hours}h
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(w.log_date), "dd MMM")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">|</span>
                      <Badge variant="secondary" className="text-[10px]">{w.category}</Badge>
                      <Badge
                        className={cn(
                          "text-[10px]",
                          w.status === "مكتملة"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                            : w.status === "قيد التنفيذ"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200"
                        )}
                      >
                        {w.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
