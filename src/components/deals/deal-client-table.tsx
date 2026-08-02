"use client";

import { useTranslations } from "next-intl";
import {
  Phone,
  MapPin,
  CheckCheck,
  Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AIMatchResult } from "@/lib/ai-matching";

function initialsOf(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??";
}

function formatPrice(n: number) {
  if (n == null || n === 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

const SCORE_COLORS = ["#06c167", "#276ef1", "#8b5cf6"];

function CustomScoreTooltip({ active, payload }: Record<string, unknown>) {
  if (!active || !payload || !(payload as { payload: { name: string; score: number; reason: string } }[]).length) return null;
  const d = (payload as { payload: { name: string; score: number; reason: string } }[])[0].payload;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md text-xs">
      <p className="font-semibold mb-1">{d.name}</p>
      <p className="text-primary font-bold">{d.score}% Match</p>
      <p className="text-muted-foreground mt-1 max-w-[200px]">{d.reason}</p>
    </div>
  );
}

export function DealClientTable({
  client,
  selectedMatches,
  onToggleMatch,
  onToggleAll,
}: {
  client: AIMatchResult;
  selectedMatches: Set<string>;
  onToggleMatch: (clientId: string, unitId: string) => void;
  onToggleAll: (clientId: string, unitIds: string[]) => void;
}) {
  const t = useTranslations("Deals");
  const units = client.top_units;
  const allSelected = units.every((u) => selectedMatches.has(`${client.client_id}::${u.unit_id}`));

  const chartData = units.map((u, i) => ({
    name: u.unit_name?.slice(0, 15) ?? `#${i + 1}`,
    score: Math.round(u.score),
    reason: u.reasoning,
    fill: SCORE_COLORS[i] ?? "#06c167",
  }));

  const avgScore = units.length > 0 ? Math.round(units.reduce((s, u) => s + u.score, 0) / units.length) : 0;
  const totalPrices = units.map((u) => u.unit_cash + u.unit_remaining);
  const priceRange = totalPrices.length > 0 ? `${formatPrice(Math.min(...totalPrices))} - ${formatPrice(Math.max(...totalPrices))}` : "—";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 border-b px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary">
              {initialsOf(client.client_name)}
            </div>
            <div>
              <h3 className="text-lg font-bold">{client.client_name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {client.client_phone && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />{client.client_phone}
                  </span>
                )}
                {client.client_type && (
                  <Badge variant="outline" className="text-[10px] h-5">{client.client_type}</Badge>
                )}
                {client.client_budget && (
                  <Badge className="text-[10px] h-5">{client.client_budget} EGP</Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleAll(client.client_id, units.map((u) => u.unit_id))}
            className="text-xs"
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            {allSelected ? t("deselectAll") : t("selectAll")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <colgroup>
              <col width="44" />
              <col width="44" />
              <col width="160" />
              <col width="120" />
              <col width="130" />
              <col width="100" />
              <col width="110" />
              <col width="100" />
              <col width="110" />
              <col width="130" />
              <col width="130" />
              <col width="110" />
              <col width="160" />
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-3 text-left"></th>
                <th className="px-2 py-3 text-left text-[11px] font-medium text-muted-foreground">#</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("ownerName")}</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("phone")}</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("compound")}</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("area")}</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("type")}</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("finishing")}</th>
                <th className="px-3 py-3 text-left text-[11px] font-medium text-muted-foreground">{t("employee")}</th>
                <th className="px-3 py-3 text-right text-[11px] font-medium text-muted-foreground">{t("cashRequired")}</th>
                <th className="px-3 py-3 text-right text-[11px] font-medium text-muted-foreground">{t("remaining")}</th>
                <th className="px-3 py-3 text-center text-[11px] font-medium text-muted-foreground">{t("matchScore")}</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => {
                const key = `${client.client_id}::${unit.unit_id}`;
                const isSelected = selectedMatches.has(key);
                const scoreColor = unit.score >= 70 ? "text-primary" : unit.score >= 40 ? "text-amber-500" : "text-destructive";

                return (
                  <tr
                    key={unit.unit_id}
                    className={cn(
                      "border-b last:border-b-0 transition-colors hover:bg-muted/20",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleMatch(client.client_id, unit.unit_id)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant={unit.rank === 1 ? "default" : "outline"} className="text-[10px] h-5">
                        {unit.rank}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium truncate">{unit.unit_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{unit.reasoning}</p>
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums">{unit.unit_phone || "—"}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{unit.unit_compound || "—"}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums">{unit.unit_area ? `${unit.unit_area} m²` : "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {unit.unit_type && <Badge variant="outline" className="text-[10px] h-5">{unit.unit_type}</Badge>}
                        {unit.unit_rent_sale && <Badge variant="outline" className="text-[10px] h-5">{unit.unit_rent_sale}</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {unit.unit_finishing && <Badge variant="outline" className="text-[10px] h-5">{unit.unit_finishing}</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      {unit.unit_employee ? (
                        <span className="text-xs font-medium">{unit.unit_employee}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums text-right font-medium">
                      {unit.unit_cash > 0 ? unit.unit_cash.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums text-right text-muted-foreground">
                      {unit.unit_remaining > 0 ? unit.unit_remaining.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-3 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-full max-w-[80px] overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-1000 ease-out",
                              unit.score >= 70 ? "bg-primary" : unit.score >= 40 ? "bg-amber-500" : "bg-destructive"
                            )}
                            style={{ width: `${Math.min(100, unit.score)}%` }}
                          />
                        </div>
                        <span className={cn("text-sm font-bold tabular-nums w-10 text-right", scoreColor)}>
                          {Math.round(unit.score)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      <div className="border-t px-6 py-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            {t("scoreComparison")}
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<CustomScoreTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={32}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
                <LabelList dataKey="score" position="right" formatter={(v: unknown) => `${v}%`} style={{ fontSize: 12, fontWeight: 600, fill: "var(--muted-foreground)" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3 content-start">
          <Card className="bg-muted/20 border-0">
            <CardContent className="flex flex-col items-center justify-center p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("avgScore")}</p>
              <p className={cn("text-2xl font-bold mt-1", avgScore >= 70 ? "text-primary" : avgScore >= 40 ? "text-amber-500" : "text-destructive")}>{avgScore}%</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/20 border-0">
            <CardContent className="flex flex-col items-center justify-center p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("matches")}</p>
              <p className="text-2xl font-bold mt-1">{units.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/20 border-0">
            <CardContent className="flex flex-col items-center justify-center p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("priceRange")}</p>
              <p className="text-sm font-bold mt-1">{priceRange}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/20 border-0">
            <CardContent className="flex flex-col items-center justify-center p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("topScore")}</p>
              <p className={cn("text-2xl font-bold mt-1", (units[0]?.score ?? 0) >= 70 ? "text-primary" : (units[0]?.score ?? 0) >= 40 ? "text-amber-500" : "text-destructive")}>{Math.round(units[0]?.score ?? 0)}%</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Card>
  );
}
