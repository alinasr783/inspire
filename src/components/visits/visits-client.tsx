"use client";

import { useState, useMemo, useEffect, useDeferredValue } from "react";
import { useTranslations } from "next-intl";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { VisitTable, type VisitTableRow } from "@/components/visits/visit-table";
import { Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";

interface VisitsClientProps {
  initialVisits: VisitTableRow[];
  locale: string;
  isAdmin: boolean;
  userId: string;
}

export function VisitsClient({ initialVisits, locale, isAdmin, userId }: VisitsClientProps) {
  const t = useTranslations("Visits");

  const { data: liveVisits, setInitialData } = useRealtimeSync<VisitTableRow>("visits");
  useEffect(() => { setInitialData(initialVisits); }, [initialVisits, setInitialData]);

  const visitsData = liveVisits.length > 0 ? liveVisits : initialVisits;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredVisits = useMemo(() => {
    let result = visitsData;
    if (statusFilter !== "all") {
      result = result.filter((v) => v.status === statusFilter);
    }
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      result = result.filter(
        (v) =>
          v.client_name.toLowerCase().includes(q) ||
          v.client_phone.toLowerCase().includes(q) ||
          v.unit_name.toLowerCase().includes(q) ||
          v.unit_phone.toLowerCase().includes(q) ||
          v.compound_name.toLowerCase().includes(q) ||
          v.building_number.toLowerCase().includes(q) ||
          v.apartment_number.toLowerCase().includes(q) ||
          (v.notes ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [visitsData, statusFilter, deferredSearch]);

  const stats = useMemo(() => {
    const upcoming = visitsData.filter((v) => v.status === "upcoming").length;
    const completed = visitsData.filter((v) => v.status === "completed").length;
    const cancelled = visitsData.filter((v) => v.status === "cancelled").length;
    return { total: visitsData.length, upcoming, completed, cancelled };
  }, [visitsData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {t("allVisits")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">{stats.total}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-blue-600">
            <Clock className="h-3.5 w-3.5" />
            {t("status_upcoming")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-blue-600">{stats.upcoming}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("status_completed")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600">{stats.completed}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-red-500">
            <XCircle className="h-3.5 w-3.5" />
            {t("status_cancelled")}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-red-500">{stats.cancelled}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-9 w-full sm:max-w-xs rounded-lg border border-input bg-transparent px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex gap-1.5">
          {(["all", "upcoming", "completed", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {s === "all" ? t("allVisits") : t(`status_${s}`)}
            </button>
          ))}
        </div>
      </div>

      <VisitTable
        visits={filteredVisits}
        locale={locale}
        isAdmin={isAdmin}
        userId={userId}
      />
    </div>
  );
}
