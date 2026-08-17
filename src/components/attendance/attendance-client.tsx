"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckInButton } from "@/components/attendance/check-in-button";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { AttendanceStats } from "@/components/attendance/attendance-stats";
import { AdminCheckInDialog } from "@/components/attendance/admin-check-in-dialog";
import type { AttendanceWithEmployee } from "@/lib/attendance-actions";
import { getAttendanceByDate, getAttendanceStats, checkTodayStatus, type AttendanceStats as AttendanceStatsType } from "@/lib/attendance-actions";
import { getEgyptToday } from "@/lib/utils";
import { CalendarDays, Users, MapPin, Clock } from "lucide-react";

interface AttendanceClientProps {
  locale: string;
  isAdmin: boolean;
  userId: string;
  initialRecords: AttendanceWithEmployee[];
  initialDate: string;
  initialCheckedIn: boolean;
  initialCheckedOut: boolean;
}

export function AttendanceClient({
  locale,
  isAdmin,
  userId,
  initialRecords,
  initialDate,
  initialCheckedIn,
  initialCheckedOut,
}: AttendanceClientProps) {
  const t = useTranslations("Attendance");
  const [records, setRecords] = useState<AttendanceWithEmployee[]>(initialRecords);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [checkedOut, setCheckedOut] = useState(initialCheckedOut);
  const [stats, setStats] = useState<AttendanceStatsType | null>(null);
  const [viewMode, setViewMode] = useState<"daily" | "stats">("daily");

  const loadRecordsForDate = useCallback(async (date: string) => {
    const data = await getAttendanceByDate(date);
    setRecords(data);
  }, []);

  const loadStats = useCallback(async (year: number, month: number) => {
    const data = await getAttendanceStats(year, month);
    setStats(data);
  }, []);

  const handleCheckInSuccess = useCallback((type: "in" | "out") => {
    if (type === "in") {
      setCheckedIn(true);
      setCheckedOut(false);
      toast.success(t("checkInSuccess"));
    } else {
      setCheckedOut(true);
      toast.success(t("checkOutSuccess"));
    }
  }, [t]);

  const handleAdminCheckIn = useCallback(async () => {
    await loadRecordsForDate(selectedDate);
    toast.success(t("adminCheckInSuccess"));
  }, [selectedDate, loadRecordsForDate, t]);

  const handleUpdate = useCallback(async () => {
    await loadRecordsForDate(selectedDate);
    toast.success(t("updateSuccess"));
  }, [selectedDate, loadRecordsForDate, t]);

  const handleDelete = useCallback(async () => {
    await loadRecordsForDate(selectedDate);
    toast.success(t("deleteSuccess"));
  }, [selectedDate, loadRecordsForDate, t]);

  const dateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return { year: y, month: m, day: d };
  }, [selectedDate]);

  useEffect(() => {
    if (!isAdmin) {
      const checkDayChange = async () => {
        const today = getEgyptToday();
        if (today !== initialDate) {
          const status = await checkTodayStatus();
          setCheckedIn(status.checkedIn);
          setCheckedOut(status.checkedOut);
        }
      };
      const interval = setInterval(checkDayChange, 60000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, initialDate]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto">
        <CheckInButton
          checkedIn={checkedIn}
          checkedOut={checkedOut}
          onSuccess={handleCheckInSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {t("present")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">
            {records.length}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t("onTime")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-blue-600">
              {records.filter((r) => {
                const t = new Date(r.check_in_time);
                return t.getHours() < 11 || (t.getHours() === 11 && t.getMinutes() < 30);
              }).length}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {t("withLocation")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-violet-600">
            {records.filter((r) => r.latitude && r.longitude).length}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {t("date")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {`${String(dateObj.day).padStart(2, "0")}/${String(dateObj.month).padStart(2, "0")}`}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              void loadRecordsForDate(e.target.value);
            }}
            max={getEgyptToday()}
            className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <AdminCheckInDialog
            selectedDate={selectedDate}
            onSuccess={handleAdminCheckIn}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            records={records}
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setViewMode("daily")}
            className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === "daily"
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-input bg-background text-foreground hover:bg-muted/50"
            }`}
          >
            {t("dailyView")}
          </button>
          <button
            onClick={() => {
              setViewMode("stats");
              const d = new Date(selectedDate);
              void loadStats(d.getFullYear(), d.getMonth() + 1);
            }}
            className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === "stats"
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-input bg-background text-foreground hover:bg-muted/50"
            }`}
          >
            {t("statsView")}
          </button>
        </div>
      </div>

      {viewMode === "daily" && (
        <AttendanceTable
          records={records}
          locale={locale}
          isAdmin={isAdmin}
          userId={userId}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {viewMode === "stats" && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={`${dateObj.year}-${String(dateObj.month).padStart(2, "0")}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setSelectedDate(`${y}-${String(m).padStart(2, "0")}-01`);
                void loadStats(y, m);
              }}
              className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          {stats && (
            <AttendanceStats stats={stats} />
          )}
        </>
      )}
    </div>
  );
}
