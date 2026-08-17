"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Eye, Pencil, Trash2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { deleteDeal } from "@/lib/finance-actions";
import { assignDealCampaign } from "@/lib/ad-campaign-actions";
import type { DealWithRelations } from "@/lib/finance-types";
import type { AdCampaignOption } from "@/lib/ad-campaign-types";
import { cn } from "@/lib/utils";

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
}

function getContactTypeBadge(contactType: string): string {
  const map: Record<string, string> = {
    both: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    buyer_only: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    seller_only: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return map[contactType] ?? "";
}

export function DealsTable({
  deals,
  locale,
  onDeleted,
  campaignOptions,
}: {
  deals: DealWithRelations[];
  locale: string;
  onDeleted: () => void;
  campaignOptions?: AdCampaignOption[];
}) {
  const t = useTranslations("Finances");
  const router = useRouter();
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showCampaignCol = !!campaignOptions && campaignOptions.length >= 0;

  const handleAssignCampaign = async (dealId: string, campaignId: string) => {
    const result = await assignDealCampaign(dealId, campaignId || null);
    if (result.success) {
      toast.success(t("updateSuccess"));
      onDeleted();
    } else {
      toast.error(t("updateFailed"));
    }
  };

  const contactLabel = (ct: string) => ({
    both: t("contactBoth"), buyer_only: t("contactBuyerOnly"), seller_only: t("contactSellerOnly"),
  })[ct] || ct;

  const handleDelete = async () => {
    if (!deleteDialogId) return;
    setDeleting(true);
    const result = await deleteDeal(deleteDialogId);
    setDeleting(false);
    if (result.success) {
      toast.success(t("deleteSuccess"));
      setDeleteDialogId(null);
      onDeleted();
    } else {
      toast.error(t("deleteFailed"));
    }
  };

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">{t("noDeals")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("date")}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("contactType")}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("buyer")}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("seller")}</th>
              {showCampaignCol && (
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">
                  <span className="inline-flex items-center gap-1"><Megaphone className="size-3.5" />{t("adCampaign")}</span>
                </th>
              )}
              <th className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("buyerAmount")}</th>
              <th className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("sellerAmount")}</th>
              <th className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("commission")}</th>
              <th className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("companyNetProfit")}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground border-e">{t("partners")}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {deals.map((deal) => {
              const campaignId = deal.ad_campaign_id ?? "";
              return (
                <tr key={deal.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground border-e">{formatDate(deal.created_at, locale)}</td>
                  <td className="px-4 py-3 border-e">
                    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", getContactTypeBadge(deal.contact_type))}>
                      {contactLabel(deal.contact_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[120px] truncate border-e">{deal.buyer_name || deal.buyer_client?.customer_name || "—"}</td>
                  <td className="px-4 py-3 max-w-[120px] truncate border-e">{deal.seller_name || deal.seller_unit?.customer_name || "—"}</td>
                  {showCampaignCol && (
                    <td className="px-4 py-3 border-e">
                      <select
                        value={campaignId}
                        onChange={(e) => handleAssignCampaign(deal.id, e.target.value)}
                        className="w-full max-w-[160px] cursor-pointer rounded-md border bg-card px-2 py-1 text-xs"
                      >
                        <option value="">{t("noCampaign")}</option>
                        {campaignOptions?.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className="px-4 py-3 text-end whitespace-nowrap font-medium border-e">{formatCurrency(deal.buyer_amount)}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap font-medium border-e">{formatCurrency(deal.seller_amount)}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap font-semibold border-e">{formatCurrency(deal.final_commission)}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap font-semibold text-emerald-600 border-e">{formatCurrency(deal.company_net_profit)}</td>
                  <td className="px-4 py-3 border-e">
                    <div className="flex flex-wrap justify-center gap-1">
                      {(deal.partners ?? []).slice(0, 2).map((p) => (
                        <span key={p.id} className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          {[p.profile?.first_name, p.profile?.second_name].filter(Boolean).join(" ") || "—"}
                        </span>
                      ))}
                      {(deal.partners ?? []).length > 2 && (
                        <span className="inline-block text-[10px] text-muted-foreground">+{(deal.partners ?? []).length - 2}</span>
                      )}
                      {(deal.partners ?? []).length === 0 && <span className="text-[10px] text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary" onClick={() => router.push(`/finances/${deal.id}`)}>
                        <Eye className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary" onClick={() => router.push(`/finances/${deal.id}/edit`)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteDialogId(deal.id)}>
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
        confirmLabel={deleting ? "..." : t("delete")}
        cancelLabel={t("cancel")}
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
