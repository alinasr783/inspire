"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { DealWithRelations } from "@/lib/finance-types";
import { ArrowLeft, Users, Building2, Eye, CalendarDays, ChevronRight } from "lucide-react";

const rtlFlip = "rtl:scale-x-[-1]";

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function getName(e: { first_name?: string | null; second_name?: string | null }): string {
  return [e.first_name, e.second_name].filter(Boolean).join(" ") || "—";
}

export function PartnerDetailPage({ data }: {
  data: {
    profile: { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null };
    deals: DealWithRelations[];
    total_profit: number;
    deal_count: number;
  };
}) {
  const t = useTranslations("Finances");
  const router = useRouter();
  const name = getName(data.profile);
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/finances")}>
            <ArrowLeft className={`size-5 ${rtlFlip}`} />
          </Button>
          <Avatar className="size-12 rounded-2xl sm:size-14">
            <AvatarImage src={data.profile.avatar_url ?? undefined} />
            <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-semibold sm:text-lg">{initials || "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate sm:text-2xl">{name}</h1>
            <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground sm:text-sm">
              <span>{data.profile.position || "—"}</span>
              <span>{t("dealsCount", { count: data.deal_count })}</span>
              <span>{t("totalEarned")}: <span className="font-semibold text-purple-600">{formatCurrency(data.total_profit)}</span></span>
            </p>
          </div>
        </div>
      </div>

      {data.deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">{t("partnerNoDeals")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {data.deals.map((deal) => {
            const rec = deal.partners?.find((p) => p.partner_id === data.profile.id);
            return (
              <Card key={deal.id} className="shadow-sm overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-medium px-2.5 py-0.5">
                          {{ both: t("contactBoth"), buyer_only: t("contactBuyerOnly"), seller_only: t("contactSellerOnly") }[deal.contact_type] || deal.contact_type}
                        </Badge>
                        {rec && (
                          <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-0.5">
                            {Math.round(rec.percentage * 100) / 100}%
                          </Badge>
                        )}
                      </div>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="size-3" /> {formatDate(deal.created_at)}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {deal.buyer_name && (
                        <div className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3">
                          <Users className="size-4 text-blue-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{t("buyer")}</p>
                            <p className="text-sm font-medium truncate">{deal.buyer_name}</p>
                          </div>
                        </div>
                      )}
                      {deal.seller_name && (
                        <div className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3">
                          <Building2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{t("seller")}</p>
                            <p className="text-sm font-medium truncate">{deal.seller_name}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <p className="text-[11px] text-muted-foreground">{t("finalCommission")}</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(deal.final_commission)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{t("companyNetProfit")}</p>
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(deal.company_net_profit)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{t("partnerProfit")}</p>
                        <p className="text-sm font-bold text-purple-600">{formatCurrency(rec?.profit_amount)}</p>
                      </div>
                      <div className="flex items-end justify-end sm:col-span-1">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/finances/${deal.id}`)} className="gap-1.5 text-xs w-full sm:w-auto">
                          <Eye className="size-3.5" /> {t("dealDetails")} <ChevronRight className={`size-3.5 ${rtlFlip}`} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
