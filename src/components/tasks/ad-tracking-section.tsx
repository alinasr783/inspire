"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Megaphone, ChevronLeft, ChevronRight, Save,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAdsQuery, useSaveAdMutation } from "@/hooks/queries/use-ads-query";

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split("-");
  return `${parts[2]}/${parts[1]}`;
}

function DateTick(props: Record<string, unknown>) {
  const { x, y, payload } = props as { x?: number; y?: number; payload?: { value: string } };
  if (!payload || x == null || y == null) return null;
  const [m, d] = payload.value.split("-").slice(1);
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" fill="var(--muted-foreground)" fontSize={10}>
      {`${d}/${m}`}
    </text>
  );
}

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  const t = useTranslations("Tasks");
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        borderRadius: 8,
        border: "1px solid var(--border)",
        backgroundColor: "var(--card)",
        padding: "8px 12px",
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 2 }}>{label ? formatDisplayDate(label) : ""}</p>
      <p style={{ color: payload[0].color }}>
        {t("adCount")}: {payload[0].value}
      </p>
    </div>
  );
}

function getWeekWindow(offset: number): { startDate: string; endDate: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - offset * 7);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { startDate: toDateStr(start), endDate: toDateStr(end) };
}

export function AdTrackingSection({ employeeId }: { employeeId: string }) {
  const t = useTranslations("Tasks");
  const [weekOffset, setWeekOffset] = useState(0);
  const [inputDate, setInputDate] = useState(() => toDateStr(new Date()));
  const [adCount, setAdCount] = useState("");
  const [saving, setSaving] = useState(false);

  const { startDate, endDate } = useMemo(() => getWeekWindow(weekOffset), [weekOffset]);

  const { data: adsData, isLoading } = useAdsQuery(employeeId, startDate, endDate);
  const saveMutation = useSaveAdMutation(employeeId);

  const chartData = useMemo(() => {
    if (!adsData) return [];
    return adsData.map((d) => ({
      date: d.date,
      count: d.count,
    }));
  }, [adsData]);

  const totalThisWeek = useMemo(() => chartData.reduce((s, d) => s + d.count, 0), [chartData]);

  const handleSave = useCallback(async () => {
    const count = parseInt(adCount, 10);
    if (isNaN(count) || count < 0) {
      toast.error(t("invalidAdCount"));
      return;
    }
    setSaving(true);
    try {
      await saveMutation.mutateAsync({ entryDate: inputDate, adCount: count });
      toast.success(t("adSaved"));
      setAdCount("");
    } catch {
      toast.error(t("adSaveFailed"));
    } finally {
      setSaving(false);
    }
  }, [adCount, inputDate, saveMutation, t]);

  const isTodaySelected = inputDate === toDateStr(new Date());

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-chart-4" />
          {t("adTracking")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setWeekOffset((o) => o + 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[120px] text-center tabular-nums">
              {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={weekOffset === 0}
              onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {t("totalThisWeek")}: {totalThisWeek}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={DateTick}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name={t("ads")}
                stroke="var(--chart-4)"
                strokeWidth={2}
                dot={{ fill: "var(--chart-4)", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("date")}</label>
            <input
              type="date"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1",
                "text-sm shadow-sm transition-colors",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              )}
            />
          </div>
          <div className="flex-[2] space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("adCount")}</label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={adCount}
              onChange={(e) => setAdCount(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            size="sm"
            className="h-9 shrink-0"
            onClick={handleSave}
            disabled={saving || !adCount.trim()}
          >
            <Save className={cn("h-3.5 w-3.5", !isTodaySelected && "me-1")} />
            {!isTodaySelected && t("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
