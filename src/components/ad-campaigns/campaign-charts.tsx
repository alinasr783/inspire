"use client";

import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart as RPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, PieChart, Activity, Layers, BarChart3 } from "lucide-react";
import type { AdCampaignWithStats } from "@/lib/ad-campaign-types";
import { formatCompact } from "./format";

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  backgroundColor: "var(--card)",
  fontSize: 12,
} as const;

const CHART_COLORS = [
  "#06c167", "#276ef1", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16",
];

function shortName(name: string, max = 14): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

export function CampaignCharts({ campaigns }: { campaigns: AdCampaignWithStats[] }) {
  const t = useTranslations("AdCampaigns");

  if (campaigns.length === 0) {
    return null;
  }

  const netProfitData = campaigns.map((c) => ({
    name: shortName(c.name),
    value: c.stats.netProfit,
    fill: c.stats.netProfit >= 0 ? "#06c167" : "#ef4444",
  }));

  const spendVsProfit = campaigns.map((c) => ({
    name: shortName(c.name),
    [t("spend")]: c.total_cost,
    [t("profit")]: c.stats.netProfit,
  }));

  const platformData = (() => {
    const map = new Map<string, number>();
    for (const c of campaigns) {
      const key = c.platform || "other";
      map.set(key, (map.get(key) ?? 0) + c.total_cost);
    }
    return Array.from(map.entries()).map(([key, value]) => ({
      name: t.has(`platform_${key}`) ? t(`platform_${key}`) : key,
      value,
    }));
  })();

  const cumulative = (() => {
    const sorted = [...campaigns].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sorted.reduce<{ name: string; spend: number; profit: number }[]>((acc, c) => {
      const prev = acc[acc.length - 1] ?? { spend: 0, profit: 0 };
      acc.push({
        name: shortName(c.name),
        spend: prev.spend + c.total_cost,
        profit: prev.profit + c.stats.netProfit,
      });
      return acc;
    }, []);
  })();

  const conversionData = campaigns.map((c) => ({
    name: shortName(c.name),
    [t("clients")]: c.stats.clientsCount,
    [t("deals")]: c.stats.dealsCount,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-chart-1" />
            {t("chartsNetProfit")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={netProfitData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCompact(v)} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="value" name={t("netProfit")} radius={[4, 4, 0, 0]} maxBarSize={40}>
                {netProfitData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-chart-4" />
            {t("chartsSpendVsProfit")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={spendVsProfit} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCompact(v)} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} iconType="circle" iconSize={8} />
              <Bar dataKey={t("spend")} fill="var(--chart-4)" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey={t("profit")} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-4 w-4 text-chart-2" />
            {t("chartsSpendByPlatform")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          {platformData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RPieChart>
                <Pie data={platformData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {platformData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </RPieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-sm text-muted-foreground">{t("noData")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-chart-3" />
            {t("chartsCumulative")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cumulative} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCompact(v)} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="spend" name={t("spend")} stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="profit" name={t("profit")} stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-chart-5" />
            {t("chartsConversion")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={conversionData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} iconType="circle" iconSize={8} />
              <Bar dataKey={t("clients")} fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey={t("deals")} fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
