"use client";

import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export type MonthlyPoint = {
  month: string;
  properties: number;
  clients: number;
  deals: number;
};

const COLORS = {
  properties: "#06c167",
  clients: "#276ef1",
  deals: "#8b5cf6",
} as const;

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function MonthlyTrendChart({
  data,
}: {
  data: MonthlyPoint[];
}) {
  const t = useTranslations("Home");

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            {t("monthlyTrend")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("chartNoData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          {t("monthlyTrend")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
            <Bar
              dataKey="properties"
              name={t("totalProperties")}
              fill={COLORS.properties}
              radius={[4, 4, 0, 0]}
            >
              {data.map((_, i) => (
                <Cell key={`p-${i}`} fill={COLORS.properties} />
              ))}
            </Bar>
            <Bar
              dataKey="clients"
              name={t("totalClients")}
              fill={COLORS.clients}
              radius={[4, 4, 0, 0]}
            >
              {data.map((_, i) => (
                <Cell key={`c-${i}`} fill={COLORS.clients} />
              ))}
            </Bar>
            <Bar
              dataKey="deals"
              name={t("totalDeals")}
              fill={COLORS.deals}
              radius={[4, 4, 0, 0]}
            >
              {data.map((_, i) => (
                <Cell key={`d-${i}`} fill={COLORS.deals} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
