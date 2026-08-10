"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, ExternalLink, TrendingUp, PhoneCall, Clock, Ban } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useEmployeeClientsQuery, useEmployeeClientContactHealthQuery, useEmployeeClientsMonthlyTrendQuery } from "@/hooks/queries/use-team-query";
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

export function EmployeeClientsTab({ employeeId }: { employeeId: string }) {
  const t = useTranslations("Team");
  const { data: clients, isLoading } = useEmployeeClientsQuery(employeeId);
  const { data: contactHealth } = useEmployeeClientContactHealthQuery(employeeId);
  const { data: monthlyTrend } = useEmployeeClientsMonthlyTrendQuery(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {contactHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Clients Contact Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
                <PhoneCall className="h-4 w-4 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">{contactHealth.recent}</p>
                  <p className="text-[10px] text-muted-foreground">Recent (&lt; 7d)</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
                <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-lg font-bold text-red-700 dark:text-red-300">{contactHealth.stale}</p>
                  <p className="text-[10px] text-muted-foreground">Stale (&gt; 7d)</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 p-3">
                <Ban className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{contactHealth.never}</p>
                  <p className="text-[10px] text-muted-foreground">Not Contacted</p>
                </div>
              </div>
            </div>
            <ProportionBar segments={[
              { label: "contacted", count: contactHealth.recent, color: "#10b981" },
              { label: "stale", count: contactHealth.stale, color: "#ef4444" },
              { label: "never", count: contactHealth.never, color: "#9ca3af" },
            ]} />
          </CardContent>
        </Card>
      )}

      {monthlyTrend && monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Clients Added Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={<MonthTick />} />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(v) => v as string} />
                <Line type="monotone" dataKey="count" name="Clients" stroke="var(--chart-2)" strokeWidth={2}
                  dot={{ fill: "var(--chart-2)", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t("clientsTab")} ({clients?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!clients || clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noClients")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-3 py-2 text-start font-medium">{t("firstName")}</th>
                    <th className="px-3 py-2 text-start font-medium">{t("phone")}</th>
                    <th className="px-3 py-2 text-start font-medium hidden md:table-cell">{t("properties")}</th>
                    <th className="px-3 py-2 text-start font-medium hidden md:table-cell">{t("checkInDate")}</th>
                    <th className="px-3 py-2 text-end font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{c.customer_name}</td>
                      <td className="px-3 py-2 text-xs" dir="ltr">{c.phone}</td>
                      <td className="px-3 py-2 text-xs hidden md:table-cell">
                        {c.preferred_area ? (
                          <Badge variant="outline" className="text-[10px]">{c.preferred_area}</Badge>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">
                        {c.created_at ? format(new Date(c.created_at), "yyyy/MM/dd") : "—"}
                      </td>
                      <td className="px-3 py-2 text-end">
                        <Link href={`/clients/${c.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
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
