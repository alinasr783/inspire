"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  BarChart3, PieChart, TrendingUp, Users, Building2, ListChecks,
  Handshake, Banknote, Target, Loader2, Activity,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart as RPieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fetchReports, type ReportData } from "@/lib/report-actions";

const MONTH_OPTIONS = [
  { value: 3, label: "3M" },
  { value: 6, label: "6M" },
  { value: 12, label: "1Y" },
  { value: 24, label: "2Y" },
] as const;

function formatPrice(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function MonthTick(props: Record<string, unknown>) {
  const { x, y, payload } = props as { x?: number; y?: number; payload?: { value: string } };
  if (!payload || x == null || y == null) return null;
  const parts = payload.value.split("-");
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" fill="var(--muted-foreground)" fontSize={11}>
      {parts[1]}/{parts[0]?.slice(2)}
    </text>
  );
}

export function ReportsPage({ initialData }: { initialData: ReportData }) {
  const t = useTranslations("Reports");
  const [data, setData] = useState<ReportData>(initialData);
  const [months, setMonths] = useState(12);
  const [loading, startLoad] = useTransition();

  const handleRangeChange = (m: number) => {
    if (m === months) return;
    setMonths(m);
    startLoad(async () => {
      try {
        const fresh = await fetchReports(m);
        setData(fresh);
      } catch {
        toast.error("Failed to load reports");
      }
    });
  };

  const statCards = [
    { icon: Building2, label: t("totalUnits"), value: data.totalUnits, color: "text-chart-1" },
    { icon: Users, label: t("totalClients"), value: data.totalClients, color: "text-chart-2" },
    { icon: ListChecks, label: t("totalTasks"), value: data.totalTasks, color: "text-chart-5" },
    { icon: Handshake, label: t("totalDeals"), value: data.totalDeals, color: "text-chart-4" },
    { icon: Banknote, label: t("totalCash"), value: formatPrice(data.totalCashRequired), color: "text-primary" },
    { icon: Target, label: t("totalRemaining"), value: formatPrice(data.totalRemaining), color: "text-chart-3" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border bg-muted/30 p-1">
          {MONTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRangeChange(opt.value)}
              disabled={loading}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                months === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => (
          <Card key={card.label} className="border-0 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center p-4 gap-1.5">
              <card.icon className={cn("h-5 w-5", card.color)} />
              <p className="text-2xl font-bold tabular-nums">{card.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide text-center">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-chart-1" />
              {t("unitsOverTime")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.unitsByMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" tick={MonthTick} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--card)" }} />
                <Bar dataKey="count" name={t("units")} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-chart-2" />
              {t("clientsOverTime")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.clientsByMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" tick={MonthTick} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--card)" }} />
                <Line type="monotone" dataKey="count" name={t("clients")} stroke="var(--chart-2)" strokeWidth={2} dot={{ fill: "var(--chart-2)", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-chart-1" />
              {t("unitsByType")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {data.unitsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie data={data.unitsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55}                 label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {data.unitsByType.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--card)" }} />
                </RPieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12">{t("noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-chart-4" />
              {t("unitsByFinishing")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {data.unitsByFinishing.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie data={data.unitsByFinishing} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55}                 label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {data.unitsByFinishing.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--card)" }} />
                </RPieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12">{t("noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-chart-5" />
              {t("weeklyRadar")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart
                data={data.unitsByWeek.map((u, i) => ({
                  week: u.month.replace("-W", " W"),
                  units: u.count,
                  clients: data.clientsByWeek[i]?.count ?? 0,
                }))}
                cx="50%" cy="50%" outerRadius="75%"
              >
                <PolarGrid className="stroke-border" strokeDasharray="4 4" />
                <PolarAngleAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fontWeight: 500, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                />
                <PolarRadiusAxis
                  angle={22.5}
                  domain={[0, "auto"]}
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                />
                <Radar
                  name={t("units")}
                  dataKey="units"
                  stroke="#06c167"
                  fill="#06c167"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#06c167", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#06c167", stroke: "#fff", strokeWidth: 2 }}
                />
                <Radar
                  name={t("clients")}
                  dataKey="clients"
                  stroke="#276ef1"
                  fill="#276ef1"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#276ef1", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#276ef1", stroke: "#fff", strokeWidth: 2 }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-chart-3" />
              {t("unitsByRentSale")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.unitsByRentSale.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.unitsByRentSale} layout="vertical" margin={{ top: 4, right: 4, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--card)" }} />
                  <Bar dataKey="value" name={t("count")} radius={[0, 4, 4, 0]} maxBarSize={32}>
                    {data.unitsByRentSale.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12">{t("noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-chart-1" />
              {t("topCompounds")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCompounds.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.topCompounds} layout="vertical" margin={{ top: 4, right: 4, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--card)" }} />
                  <Bar dataKey="count" name={t("units")} radius={[0, 4, 4, 0]} maxBarSize={32}>
                    {data.topCompounds.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12">{t("noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-chart-1" />
              {t("contactHealthUnits")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {data.contactHealthUnits.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie data={data.contactHealthUnits} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {data.contactHealthUnits.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--card)" }} />
                </RPieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12">{t("noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-chart-2" />
              {t("contactHealthClients")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {data.contactHealthClients.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie data={data.contactHealthClients} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {data.contactHealthClients.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--card)" }} />
                </RPieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12">{t("noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-chart-4" />
              {t("contactHealthUnconfirmed")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {data.contactHealthUnconfirmed.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie data={data.contactHealthUnconfirmed} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {data.contactHealthUnconfirmed.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--card)" }} />
                </RPieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-12">{t("noData")}</p>
            )}
          </CardContent>
        </Card>

        {data.totalDeals > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Handshake className="h-4 w-4 text-chart-4" />
                {t("dealsOverview")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[
                    { name: t("approved"), value: data.approvedDeals, fill: "var(--chart-1)" },
                    { name: t("pending"), value: data.pendingDeals, fill: "var(--chart-4)" },
                    { name: t("rejected"), value: data.rejectedDeals, fill: "var(--chart-3)" },
                  ]}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--card)" }} />
                  <Bar dataKey="value" name={t("count")} radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {[
                      { name: t("approved"), value: data.approvedDeals, fill: "var(--chart-1)" },
                      { name: t("pending"), value: data.pendingDeals, fill: "var(--chart-4)" },
                      { name: t("rejected"), value: data.rejectedDeals, fill: "var(--chart-3)" },
                    ].map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

const CHART_COLORS = [
  "#06c167", "#276ef1", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16",
];
