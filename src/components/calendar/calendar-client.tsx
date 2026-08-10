"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  ListChecks,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDailyWorkLogsQuery } from "@/hooks/queries/use-daily-work-logs-query";
import { LogEntryModal } from "@/components/calendar/log-entry-modal";
import {
  WORK_CATEGORIES,
  WORK_STATUSES,
} from "@/lib/daily-work-log-types";
import type {
  DailyWorkLogWithEmployee,
  MonthlyStats,
} from "@/lib/daily-work-log-types";

interface CalendarClientProps {
  locale: string;
  isAdmin: boolean;
  userId: string;
  initialLogs: DailyWorkLogWithEmployee[];
  employees: {
    id: string;
    first_name: string;
    second_name: string;
    avatar_url: string | null;
    position: string;
  }[];
  initialStats: MonthlyStats;
}

const CATEGORY_COLORS: Record<string, string> = {
  تطوير: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  تصميم: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  اجتماعات: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "دعم فني": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  تسويق: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  مبيعات: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  تدريب: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  إداري: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const CATEGORY_DOT_COLORS: Record<string, string> = {
  تطوير: "bg-blue-500",
  تصميم: "bg-purple-500",
  اجتماعات: "bg-orange-500",
  "دعم فني": "bg-cyan-500",
  تسويق: "bg-pink-500",
  مبيعات: "bg-emerald-500",
  تدريب: "bg-teal-500",
  إداري: "bg-slate-500",
};

const STATUS_COLORS: Record<string, string> = {
  مكتملة: "bg-emerald-500/20 text-emerald-400",
  "قيد التنفيذ": "bg-blue-500/20 text-blue-400",
  متوقفة: "bg-amber-500/20 text-amber-400",
};

function getWeekDays(locale: string): string[] {
  return locale === "ar"
    ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

export function CalendarClient({
  locale,
  isAdmin,
  userId,
  initialLogs,
  employees,
  initialStats,
}: CalendarClientProps) {
  const t = useTranslations("Calendar");

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "add" | "edit">("view");
  const [editingLog, setEditingLog] = useState<DailyWorkLogWithEmployee | null>(null);

  const { data: logs = initialLogs } = useDailyWorkLogsQuery(
    currentYear,
    currentMonth,
    selectedEmployee || undefined,
    initialLogs
  );

  const goToPrevMonth = useCallback(() => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  }, [now]);

  const monthName = useMemo(
    () =>
      new Date(currentYear, currentMonth - 1).toLocaleString(
        locale === "ar" ? "ar-EG" : "en-US",
        { month: "long", year: "numeric" }
      ),
    [currentYear, currentMonth, locale]
  );

  const todayStr = now.toISOString().split("T")[0];

  const logsByDate = useMemo(() => {
    const map = new Map<string, DailyWorkLogWithEmployee[]>();
    for (const log of logs) {
      const entries = map.get(log.log_date) || [];
      entries.push(log);
      map.set(log.log_date, entries);
    }
    return map;
  }, [logs]);

  const stats = useMemo(() => {
    const filteredLogs = selectedEmployee
      ? logs.filter((l) => l.employee_id === selectedEmployee)
      : logs;
    const totalHours = filteredLogs.reduce((s, l) => s + (l.hours || 0), 0);
    const completed = filteredLogs.filter((l) => l.status === "مكتملة").length;
    return {
      totalHours,
      totalEntries: filteredLogs.length,
      completionRate:
        filteredLogs.length > 0
          ? Math.round((completed / filteredLogs.length) * 100)
          : 0,
    };
  }, [logs, selectedEmployee]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: { day: number; dateStr: string }[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, dateStr: "" });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({ day, dateStr });
    }

    return days;
  }, [currentYear, currentMonth]);

  const weekDays = getWeekDays(locale);

  const handleDayClick = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setModalMode("view");
    setEditingLog(null);
  }, []);

  const handleAddEntry = useCallback(() => {
    setModalMode("add");
    setEditingLog(null);
  }, []);

  const handleEditEntry = useCallback(
    (log: DailyWorkLogWithEmployee) => {
      setModalMode("edit");
      setEditingLog(log);
    },
    []
  );

  const handleCloseModal = useCallback(() => {
    setSelectedDate(null);
    setModalMode("view");
    setEditingLog(null);
  }, []);

  const dayEntries = selectedDate ? logsByDate.get(selectedDate) || [] : [];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {t("title")}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t("totalHours")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {stats.totalHours}h
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            {t("totalEntries")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {stats.totalEntries}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("completionRate")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {stats.completionRate}%
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm ring-1 ring-foreground/5">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={goToPrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="min-w-[140px] text-center text-sm font-bold">
              {monthName}
            </h3>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg text-xs"
              onClick={goToToday}
            >
              {t("today")}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="h-8 w-[180px] rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{t("allEmployees")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {[emp.first_name, emp.second_name]
                      .filter(Boolean)
                      .join(" ")}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="border-t">
          <div className="grid grid-cols-7">
            {weekDays.map((wd) => (
              <div
                key={wd}
                className="border-b border-e px-1 py-2 text-center text-[11px] font-semibold text-muted-foreground last:border-e-0"
              >
                {wd}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((d, i) => {
              const isToday = d.dateStr === todayStr;
              const entries = d.dateStr ? logsByDate.get(d.dateStr) : undefined;
              const dayHours = entries
                ? entries.reduce((s, l) => s + (l.hours || 0), 0)
                : 0;

              return (
                <button
                  key={i}
                  type="button"
                  disabled={d.day === 0}
                  onClick={() => d.dateStr && handleDayClick(d.dateStr)}
                  className={cn(
                    "relative flex min-h-[88px] flex-col border-b border-e p-1.5 text-start transition-colors last:border-e-0 hover:bg-muted/50",
                    d.day === 0 && "pointer-events-none bg-muted/20",
                    isToday && "bg-primary/5 ring-1 ring-inset ring-primary/20"
                  )}
                >
                  {d.day > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground"
                          )}
                        >
                          {d.day}
                        </span>
                        {dayHours > 0 && (
                          <span className="text-[10px] font-medium text-primary">
                            {dayHours}h
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-1 flex-col gap-0.5 overflow-hidden">
                        {entries?.slice(0, 3).map((entry, ei) => (
                          <div
                            key={entry.id}
                            className="flex items-center gap-1 rounded-[4px] px-1 py-0.5 text-[10px] leading-tight"
                            style={{
                              backgroundColor: `${
                                CATEGORY_DOT_COLORS[entry.category] || "#64748b"
                              }15`,
                            }}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                CATEGORY_DOT_COLORS[entry.category] ||
                                  "bg-slate-500"
                              )}
                            />
                            <span className="truncate text-muted-foreground">
                              {entry.title}
                            </span>
                          </div>
                        ))}
                        {entries && entries.length > 3 && (
                          <span className="px-1 text-[10px] text-muted-foreground">
                            +{entries.length - 3} {t("more")}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedDate && (
        <LogEntryModal
          isOpen={!!selectedDate}
          onClose={handleCloseModal}
          date={selectedDate}
          entries={dayEntries}
          mode={modalMode}
          editingLog={editingLog}
          isAdmin={isAdmin}
          userId={userId}
          locale={locale}
          onAdd={handleAddEntry}
          onEdit={handleEditEntry}
        />
      )}
    </>
  );
}
