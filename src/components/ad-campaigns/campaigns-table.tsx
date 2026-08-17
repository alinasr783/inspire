"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCampaign } from "@/lib/ad-campaign-actions";
import type { AdCampaignWithStats } from "@/lib/ad-campaign-types";
import type { MetricKey } from "./metric-definitions";
import { InfoButton } from "./info-button";
import { formatMoney, formatPercent, formatDate } from "./format";
import { cn } from "@/lib/utils";

function HeaderCell({
  label,
  metric,
  onOpenMetric,
  align = "end",
}: {
  label: string;
  metric?: MetricKey;
  onOpenMetric?: (key: MetricKey) => void;
  align?: "start" | "end" | "center";
}) {
  return (
    <th
      className={cn(
        "px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e last:border-e-0",
        align === "end" ? "text-end" : align === "center" ? "text-center" : "text-start"
      )}
    >
      <span className={cn("inline-flex items-center gap-1", align === "end" ? "justify-end" : "")}>
        {label}
        {metric && onOpenMetric && <InfoButton onClick={() => onOpenMetric(metric)} />}
      </span>
    </th>
  );
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function CampaignsTable({
  campaigns,
  locale,
  onOpenMetric,
  onDeleted,
}: {
  campaigns: AdCampaignWithStats[];
  locale: string;
  onOpenMetric: (key: MetricKey) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("AdCampaigns");
  const router = useRouter();
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteDialogId) return;
    setDeleting(true);
    const result = await deleteCampaign(deleteDialogId);
    setDeleting(false);
    if (result.success) {
      toast.success(t("deleteSuccess"));
      setDeleteDialogId(null);
      onDeleted();
    } else {
      toast.error(t("deleteFailed"));
    }
  };

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">{t("noCampaigns")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("campaign")}</th>
              <HeaderCell label={t("platform")} align="start" />
              <HeaderCell label={t("period")} align="start" />
              <HeaderCell label={t("clientsCount")} metric="clientsCount" onOpenMetric={onOpenMetric} />
              <HeaderCell label={t("dealsCount")} metric="dealsCount" onOpenMetric={onOpenMetric} />
              <HeaderCell label={t("totalCost")} metric="totalSpend" onOpenMetric={onOpenMetric} />
              <HeaderCell label={t("commission")} metric="commission" onOpenMetric={onOpenMetric} />
              <HeaderCell label={t("netProfit")} metric="netProfit" onOpenMetric={onOpenMetric} />
              <HeaderCell label={t("roi")} metric="roi" onOpenMetric={onOpenMetric} />
              <HeaderCell label={t("cpa")} metric="cpa" onOpenMetric={onOpenMetric} />
              <HeaderCell label={t("conversionRate")} metric="conversionRate" onOpenMetric={onOpenMetric} />
              <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {campaigns.map((c) => {
              const netProfit = c.stats.netProfit;
              const roi = c.stats.roiPct;
              return (
                <tr
                  key={c.id}
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                  onClick={() => router.push(`/ad-campaigns/${c.id}`)}
                >
                  <td className="px-3 py-3 border-e">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                      <div className="min-w-0">
                        <p className="max-w-[160px] truncate font-medium">{c.name}</p>
                        <Badge variant="secondary" className={cn("mt-0.5 text-[10px]", STATUS_BADGE[c.status])}>
                          {t(`status_${c.status}`)}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground border-e">{c.platform ? (t.has(`platform_${c.platform}`) ? t(`platform_${c.platform}`) : c.platform) : "—"}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted-foreground border-e">
                    {c.start_date || c.end_date ? `${formatDate(c.start_date, locale)} → ${formatDate(c.end_date, locale)}` : "—"}
                  </td>
                  <td className="px-3 py-3 text-end tabular-nums font-medium border-e">{c.stats.clientsCount.toLocaleString()}</td>
                  <td className="px-3 py-3 text-end tabular-nums font-medium border-e">{c.stats.dealsCount.toLocaleString()}</td>
                  <td className="px-3 py-3 text-end tabular-nums border-e">{formatMoney(c.total_cost)}</td>
                  <td className="px-3 py-3 text-end tabular-nums border-e">{formatMoney(c.stats.totalCommission)}</td>
                  <td className={cn("px-3 py-3 text-end tabular-nums font-semibold border-e", netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {formatMoney(netProfit)}
                  </td>
                  <td className={cn("px-3 py-3 text-end tabular-nums font-semibold border-e", roi != null && roi >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {formatPercent(roi)}
                  </td>
                  <td className="px-3 py-3 text-end tabular-nums border-e">{formatMoney(c.stats.cpa)}</td>
                  <td className="px-3 py-3 text-end tabular-nums border-e">{formatPercent(c.stats.conversionRatePct)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); router.push(`/ad-campaigns/${c.id}`); }}>
                        <Eye className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); router.push(`/ad-campaigns/${c.id}/edit`); }}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteDialogId(c.id); }}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteDialogId}
        onOpenChange={(o) => { if (!o) setDeleteDialogId(null); }}
        title={t("deleteConfirm")}
        description={t("deleteWarning")}
        confirmLabel={deleting ? "..." : t("delete")}
        cancelLabel={t("cancel")}
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
