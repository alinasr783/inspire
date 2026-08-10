"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, ExternalLink, TrendingUp, PhoneCall, Clock, Ban, PieChart } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  useEmployeePropertiesQuery,
  useEmployeeOwnerContactHealthQuery,
  useEmployeeUnitsMonthlyTrendQuery,
  useEmployeeUnitsByRentSaleQuery,
  useEmployeeTopCompoundsQuery,
} from "@/hooks/queries/use-team-query";
import { format } from "date-fns";

function ProportionBar({ segments }: { segments: { label: string; count: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.count, 0) || 1;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {segments.map((seg) =>
        seg.count > 0 ? (
          <div key={seg.label} className="h-full transition-all" style={{ width: `${(seg.count / total) * 100}%`, backgroundColor: seg.color }} />
        ) : null
      )}
    </div>
  );
}

function MonthTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (!payload || x == null || y == null) return null;
  const [year, month] = payload.value.split("-");
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(month) - 1];
  return <text x={x} y={y + 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">{m}</text>;
}

export function EmployeePropertiesTab({ employeeId }: { employeeId: string }) {
  const t = useTranslations("Team");
  const { data: properties, isLoading } = useEmployeePropertiesQuery(employeeId);
  const { data: ownerHealth } = useEmployeeOwnerContactHealthQuery(employeeId);
  const { data: unitsTrend } = useEmployeeUnitsMonthlyTrendQuery(employeeId);
  const { data: rentSale } = useEmployeeUnitsByRentSaleQuery(employeeId);
  const { data: topCompounds } = useEmployeeTopCompoundsQuery(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ownerHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Owners Contact Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
                <PhoneCall className="h-4 w-4 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">{ownerHealth.recent}</p>
                  <p className="text-[10px] text-muted-foreground">Recent (&lt; 30d)</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
                <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-lg font-bold text-red-700 dark:text-red-300">{ownerHealth.stale}</p>
                  <p className="text-[10px] text-muted-foreground">Stale (&gt; 30d)</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 p-3">
                <Ban className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{ownerHealth.never}</p>
                  <p className="text-[10px] text-muted-foreground">Not Contacted</p>
                </div>
              </div>
            </div>
            <ProportionBar segments={[
              { label: "contacted", count: ownerHealth.recent, color: "#10b981" },
              { label: "stale", count: ownerHealth.stale, color: "#ef4444" },
              { label: "never", count: ownerHealth.never, color: "#9ca3af" },
            ]} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {unitsTrend && unitsTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Units Added Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={unitsTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={<MonthTick />} />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={(v) => v as string} />
                  <Bar dataKey="count" name="Units" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {rentSale && rentSale.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                Rent vs Sale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rentSale} layout="vertical" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} maxBarSize={32}>
                    {rentSale.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {topCompounds && topCompounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Top Compounds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(220, topCompounds.length * 40)}>
              <BarChart data={topCompounds} layout="vertical" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Units" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {topCompounds.map((_, i) => (
                    <Cell key={i} fill={["#06c167","#276ef1","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16","#f97316","#6366f1","#14b8a6","#a855f7","#eab308","#3b82f6","#78716c"][i % 15]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {t("propertiesTab")} ({properties?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!properties || properties.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noProperties")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-3 py-2 text-start font-medium">{t("firstName")}</th>
                    <th className="px-3 py-2 text-start font-medium hidden md:table-cell">{t("properties")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("role")}</th>
                    <th className="px-3 py-2 text-start font-medium hidden md:table-cell">{t("deals")}</th>
                    <th className="px-3 py-2 text-end font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{p.customer_name}</td>
                      <td className="px-3 py-2 text-xs hidden md:table-cell">
                        {p.compound_name ? (
                          <Badge variant="outline" className="text-[10px]">{p.compound_name}</Badge>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {p.rent_sale ? (
                          <Badge variant="secondary" className="text-[10px]">{p.rent_sale}</Badge>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">
                        {p.cash_required != null ? `${Number(p.cash_required).toLocaleString()} ج.م` : "—"}
                      </td>
                      <td className="px-3 py-2 text-end">
                        <Link href={`/properties/${p.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          {t("viewAll")}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
