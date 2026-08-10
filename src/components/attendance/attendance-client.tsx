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
}

export function AttendanceClient({
  locale,
  isAdmin,
  userId,
  initialRecords,
  initialDate,
  initialCheckedIn,
}: AttendanceClientProps) {
  const t = useTranslations("Attendance");
  const [records, setRecords] = useState<AttendanceWithEmployee[]>(initialRecords);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AttendanceStatsType | null>(null);
  const [viewMode, setViewMode] = useState<"daily" | "stats">("daily");

  const loadRecordsForDate = useCallback(async (date: string) => {
    setLoading(true);
    const data = await getAttendanceByDate(date);
    setRecords(data);
    setLoading(false);
  }, []);

  const loadStats = useCallback(async (year: number, month: number) => {
    setLoading(true);
    const data = await getAttendanceStats(year, month);
    setStats(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadRecordsForDate(selectedDate);
    }
  }, [selectedDate, loadRecordsForDate, isAdmin]);

  useEffect(() => {
    if (isAdmin && viewMode === "stats") {
      const d = new Date(selectedDate);
      loadStats(d.getFullYear(), d.getMonth() + 1);
    }
  }, [viewMode, selectedDate, loadStats, isAdmin]);

  const handleCheckInSuccess = useCallback(() => {
    setCheckedIn(true);
    toast.success(t("checkInSuccess"));
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
              return t.getHours() < 10;
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
            onChange={(e) => setSelectedDate(e.target.value)}
            max={getEgyptToday()}
            className="h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "daily"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t("dailyView")}
          </button>
          <button
            onClick={() => setViewMode("stats")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "stats"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t("statsView")}
          </button>
        </div>
      </div>

      {viewMode === "daily" && (
        <>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {!loading && (
            <AttendanceTable
              records={records}
              locale={locale}
              isAdmin={isAdmin}
              userId={userId}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          )}
        </>
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
              }}
              className="h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {!loading && stats && (
            <AttendanceStats stats={stats} />
          )}
        </>
      )}
    </div>
  );
}
