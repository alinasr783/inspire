"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { AttendanceWithEmployee } from "@/lib/attendance-actions";

interface AttendanceCalendarProps {
  records: AttendanceWithEmployee[];
  locale: string;
}

export function AttendanceCalendar({ records, locale }: AttendanceCalendarProps) {
  const t = useTranslations("Attendance");

  const { year, month, days } = useMemo(() => {
    const firstRecord = records[0];
    const d = firstRecord
      ? new Date(firstRecord.check_in_date)
      : new Date();
    const y = d.getFullYear();
    const m = d.getMonth();

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const presentDates = new Set(
      records.map((r) => r.check_in_date)
    );

    const daysArr: { day: number; present: boolean }[] = [];
    for (let i = 0; i < firstDay; i++) {
      daysArr.push({ day: 0, present: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      daysArr.push({ day, present: presentDates.has(dateStr) });
    }

    return { year: y, month: m, days: daysArr };
  }, [records]);

  const monthName = new Date(year, month).toLocaleString(
    locale === "ar" ? "ar-EG" : "en-US",
    { month: "long", year: "numeric" }
  );

  const weekDays =
    locale === "ar"
      ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const presentCount = records.length;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const rate = Math.round((presentCount / totalDays) * 100);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm ring-1 ring-foreground/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold">{monthName}</h3>
        <span className="text-xs text-muted-foreground">
          {t("attendanceRate")}: {rate}%
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((wd) => (
          <div
            key={wd}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {wd}
          </div>
        ))}
        {days.map((d, i) => (
          <div
            key={i}
            className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium ${
              d.day === 0
                ? ""
                : d.present
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            {d.day > 0 ? d.day : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
