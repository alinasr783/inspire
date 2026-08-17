"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Info,
  Sigma,
  Calculator,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from "lucide-react";
import type { MetricContent } from "./metric-definitions";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function MetricInfoDialog({
  open,
  onOpenChange,
  metric,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: MetricContent | null;
}) {
  const t = useTranslations("AdCampaigns");
  if (!metric) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="pe-8">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Info className="size-5" />
            </span>
            <DialogTitle>{metric.title}</DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-2 pt-1 text-xs font-medium text-muted-foreground">
            <Sigma className="size-3.5" />
            {t("explainMetric")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Section icon={Info} title={t("metricWhat")}>
            {metric.what}
          </Section>

          <Section icon={Calculator} title={t("metricFormula")}>
            <div
              dir="ltr"
              className="rounded-lg border border-primary/20 bg-card px-3 py-2 text-center font-mono text-sm font-semibold text-primary"
            >
              {metric.formula}
            </div>
          </Section>

          <Section icon={TrendingUp} title={t("metricExample")}>
            {metric.example}
          </Section>

          <Section icon={TrendingUp} title={t("metricImpact")}>
            <p>{metric.impact}</p>
            <div className="mt-1 flex items-start gap-2">
              <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-500">{metric.impactUp}</span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowDownRight className="mt-0.5 size-4 shrink-0 text-red-600" />
              <span className="text-red-700 dark:text-red-500">{metric.impactDown}</span>
            </div>
          </Section>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" className="gap-2" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
            {t("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
