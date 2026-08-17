"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, Users, Handshake, Phone, MapPin, Banknote } from "lucide-react";
import { MetricInfoDialog } from "./metric-info-dialog";
import { InfoButton } from "./info-button";
import { buildMetricContent, type MetricContent, type MetricKey } from "./metric-definitions";
import { formatMoney, formatPercent, formatDate } from "./format";
import type { AdCampaignDetail } from "@/lib/ad-campaign-types";
import { cn } from "@/lib/utils";

const rtlFlip = "rtl:scale-x-[-1]";

function KpiCard({
  label,
  value,
  valueClass,
  metric,
  onOpenMetric,
}: {
  label: string;
  value: string;
  valueClass?: string;
  metric: MetricKey;
  onOpenMetric: (key: MetricKey) => void;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <InfoButton onClick={() => onOpenMetric(metric)} label={label} />
        </div>
        <div className={cn("mt-2 text-xl font-bold tabular-nums tracking-tight", valueClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function CampaignDetailPage({
  campaignId,
  initialDetail,
  locale,
}: {
  campaignId: string;
  initialDetail: AdCampaignDetail | null;
  locale: string;
}) {
  const t = useTranslations("AdCampaigns");
  const router = useRouter();
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);

  if (!initialDetail) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        {t("notFound")}
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push("/ad-campaigns")}>{t("back")}</Button>
        </div>
      </div>
    );
  }

  const { campaign, stats, clients, deals } = initialDetail;
  const metricContent: MetricContent | null = activeMetric
    ? buildMetricContent(activeMetric, (k) => t(k))
    : null;

  const avgNetPerDeal = stats.dealsCount > 0 ? stats.totalCompanyNetProfit / stats.dealsCount : null;
  const breakEven =
    campaign.total_cost > 0 && avgNetPerDeal != null && avgNetPerDeal > 0
      ? Math.ceil(campaign.total_cost / avgNetPerDeal)
      : null;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/ad-campaigns")}>
            <ArrowLeft className={`size-5 ${rtlFlip}`} />
          </Button>
          <span className="size-4 rounded-full" style={{ backgroundColor: campaign.color }} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className={cn("text-[10px]", STATUS_BADGE[campaign.status])}>
                {t(`status_${campaign.status}`)}
              </Badge>
              {campaign.platform && <span>{t.has(`platform_${campaign.platform}`) ? t(`platform_${campaign.platform}`) : campaign.platform}</span>}
              {(campaign.start_date || campaign.end_date) && (
                <span>{formatDate(campaign.start_date, locale)} → {formatDate(campaign.end_date, locale)}</span>
              )}
              <span>{t("createdAt")}: {formatDate(campaign.created_at, locale)}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => router.push(`/ad-campaigns/${campaignId}/edit`)}>
          <Pencil className="size-4" />
          {t("editCampaign")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label={t("clientsCount")} value={stats.clientsCount.toLocaleString()} metric="clientsCount" onOpenMetric={setActiveMetric} />
        <KpiCard label={t("dealsCount")} value={stats.dealsCount.toLocaleString()} metric="dealsCount" onOpenMetric={setActiveMetric} />
        <KpiCard label={t("totalCost")} value={formatMoney(campaign.total_cost)} metric="totalSpend" onOpenMetric={setActiveMetric} />
        <KpiCard label={t("commission")} value={formatMoney(stats.totalCommission)} metric="commission" onOpenMetric={setActiveMetric} />
        <KpiCard
          label={t("netProfit")}
          value={formatMoney(stats.netProfit)}
          valueClass={stats.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}
          metric="netProfit"
          onOpenMetric={setActiveMetric}
        />
        <KpiCard
          label={t("roi")}
          value={formatPercent(stats.roiPct)}
          valueClass={stats.roiPct != null && stats.roiPct >= 0 ? "text-emerald-600" : "text-red-600"}
          metric="roi"
          onOpenMetric={setActiveMetric}
        />
        <KpiCard label={t("cpa")} value={formatMoney(stats.cpa)} metric="cpa" onOpenMetric={setActiveMetric} />
        <KpiCard label={t("conversionRate")} value={formatPercent(stats.conversionRatePct)} metric="conversionRate" onOpenMetric={setActiveMetric} />
        <KpiCard
          label={t("breakEven")}
          value={breakEven != null ? breakEven.toLocaleString() : "—"}
          valueClass={breakEven != null && stats.dealsCount >= breakEven ? "text-emerald-600" : "text-amber-600"}
          metric="breakEven"
          onOpenMetric={setActiveMetric}
        />
        <KpiCard label={t("costPerDeal")} value={formatMoney(stats.costPerDeal)} metric="costPerDeal" onOpenMetric={setActiveMetric} />
        <KpiCard label={t("avgRevenuePerClient")} value={formatMoney(stats.avgRevenuePerClient)} metric="avgRevenuePerClient" onOpenMetric={setActiveMetric} />
        <KpiCard label={t("avgDealValue")} value={formatMoney(stats.avgDealValue)} metric="avgDealValue" onOpenMetric={setActiveMetric} />
      </div>

      {campaign.notes && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{t("notes")}: </span>
            {campaign.notes}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-blue-600" />
            {t("linkedClients")}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{clients.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {clients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("noLinkedClients")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("clientName")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("phone")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("preferredArea")}</th>
                    <th className="px-3 py-2.5 text-end text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("budget")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("source")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("addedAt")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clients.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-medium border-e">{c.customer_name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground border-e">
                        <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" />{c.phone}</span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground border-e">
                        <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{c.preferred_area || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-end text-muted-foreground border-e">
                        {c.budget_from || c.budget_to ? `${formatMoney(c.budget_from)} – ${formatMoney(c.budget_to)}` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground border-e">{c.source || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{formatDate(c.created_at, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="size-4 text-emerald-600" />
            {t("linkedDeals")}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{deals.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {deals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("noLinkedDeals")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("date")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("buyer")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("seller")}</th>
                    <th className="px-3 py-2.5 text-end text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("commission")}</th>
                    <th className="px-3 py-2.5 text-end text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("netProfit")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deals.map((d) => (
                    <tr key={d.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground border-e">{formatDate(d.created_at, locale)}</td>
                      <td className="px-3 py-2.5 font-medium border-e">{d.buyer_name || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground border-e">{d.seller_name || d.compound_name || "—"}</td>
                      <td className="px-3 py-2.5 text-end tabular-nums font-semibold border-e">
                        <span className="inline-flex items-center gap-1"><Banknote className="size-3.5 text-primary" />{formatMoney(d.final_commission)}</span>
                      </td>
                      <td className={cn("px-3 py-2.5 text-end tabular-nums font-semibold", d.company_net_profit >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {formatMoney(d.company_net_profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <MetricInfoDialog
        open={!!activeMetric}
        onOpenChange={(open) => { if (!open) setActiveMetric(null); }}
        metric={metricContent}
      />
    </div>
  );
}
