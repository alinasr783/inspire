"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import {
  Megaphone,
  Banknote,
  Coins,
  Percent,
  Users,
  Handshake,
} from "lucide-react";
import { InfoButton } from "./info-button";
import { formatMoney, formatPercent } from "./format";
import type { AdCampaignWithStats } from "@/lib/ad-campaign-types";
import type { MetricKey } from "./metric-definitions";
import { cn } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  valueClass,
  metric,
  onOpenMetric,
}: {
  icon: React.ComponentType<{ className?: string }>;
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
          <div className="flex items-center gap-1.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
          <InfoButton onClick={() => onOpenMetric(metric)} label={label} />
        </div>
        <div className={cn("mt-2 text-2xl font-bold tabular-nums tracking-tight", valueClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function CampaignSummaryCards({
  campaigns,
  onOpenMetric,
}: {
  campaigns: AdCampaignWithStats[];
  onOpenMetric: (key: MetricKey) => void;
}) {
  const t = useTranslations("AdCampaigns");

  const totalSpend = campaigns.reduce((s, c) => s + c.total_cost, 0);
  const totalNetProfit = campaigns.reduce((s, c) => s + c.stats.netProfit, 0);
  const totalClients = campaigns.reduce((s, c) => s + c.stats.clientsCount, 0);
  const totalDeals = campaigns.reduce((s, c) => s + c.stats.dealsCount, 0);
  const overallRoi = totalSpend > 0 ? Math.round((totalNetProfit / totalSpend) * 10000) / 100 : null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatCard
        icon={Megaphone}
        label={t("campaignsCount")}
        value={campaigns.length.toLocaleString()}
        metric="campaignsCount"
        onOpenMetric={onOpenMetric}
      />
      <StatCard
        icon={Banknote}
        label={t("totalSpend")}
        value={formatMoney(totalSpend)}
        metric="totalSpend"
        onOpenMetric={onOpenMetric}
      />
      <StatCard
        icon={Coins}
        label={t("totalNetProfit")}
        value={formatMoney(totalNetProfit)}
        valueClass={totalNetProfit >= 0 ? "text-emerald-600" : "text-red-600"}
        metric="totalNetProfit"
        onOpenMetric={onOpenMetric}
      />
      <StatCard
        icon={Percent}
        label={t("overallRoi")}
        value={formatPercent(overallRoi)}
        valueClass={overallRoi != null && overallRoi >= 0 ? "text-emerald-600" : "text-red-600"}
        metric="overallRoi"
        onOpenMetric={onOpenMetric}
      />
      <StatCard
        icon={Users}
        label={t("totalClients")}
        value={totalClients.toLocaleString()}
        metric="totalClients"
        onOpenMetric={onOpenMetric}
      />
      <StatCard
        icon={Handshake}
        label={t("totalDeals")}
        value={totalDeals.toLocaleString()}
        metric="totalDeals"
        onOpenMetric={onOpenMetric}
      />
    </div>
  );
}
