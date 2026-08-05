"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { DealWithRelations } from "@/lib/finance-types";
import { ArrowLeft, Users, Eye } from "lucide-react";

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function getEmployeeName(emp: { first_name?: string | null; second_name?: string | null }): string {
  return [emp.first_name, emp.second_name].filter(Boolean).join(" ") || "—";
}

export function EmployeeDetailPage({
  data,
}: {
  data: {
    profile: { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null };
    deals: DealWithRelations[];
    total_profit: number;
    deal_count: number;
  };
}) {
  const t = useTranslations("Finances");
  const router = useRouter();
  const name = getEmployeeName(data.profile);
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const sideLabel = (side: string) => {
    if (side === "both") return t("contactBoth");
    if (side === "buyer") return t("buyerSide");
    return t("sellerSide");
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/finances")}>
            <ArrowLeft className="size-5" />
          </Button>
          <Avatar className="size-14 rounded-2xl">
            <AvatarImage src={data.profile.avatar_url ?? undefined} />
            <AvatarFallback className="rounded-2xl bg-primary/10 text-lg font-semibold">{initials || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {data.profile.position || "—"} · {t("dealsCount", { count: data.deal_count })} · {t("totalEarned")}: {formatCurrency(data.total_profit)}
            </p>
          </div>
        </div>
      </div>

      {data.deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">{t("employeeNoDeals")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {data.deals.map((deal) => {
            const empRecord = deal.employees?.find((e) => e.employee_id === data.profile.id);
            return (
              <Card key={deal.id} className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[11px]">
                          {{ both: t("contactBoth"), buyer_only: t("contactBuyerOnly"), seller_only: t("contactSellerOnly") }[deal.contact_type] || deal.contact_type}
                        </Badge>
                        {empRecord && (
                          <>
                            <Badge variant="outline" className="text-[11px]">{sideLabel(empRecord.side)}</Badge>
                            <Badge className="text-[11px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              {empRecord.percentage}%
                            </Badge>
                          </>
                        )}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 text-sm">
                        {deal.buyer_client && (
                          <div>
                            <span className="text-muted-foreground">{t("buyer")}: </span>
                            <span className="font-medium">{deal.buyer_client.customer_name}</span>
                            {deal.buyer_amount != null && (
                              <span className="text-muted-foreground"> · {deal.buyer_amount.toLocaleString()}</span>
                            )}
                          </div>
                        )}
                        {deal.seller_unit && (
                          <div>
                            <span className="text-muted-foreground">{t("seller")}: </span>
                            <span className="font-medium">{deal.seller_unit.customer_name}</span>
                            {deal.seller_amount != null && (
                              <span className="text-muted-foreground"> · {deal.seller_amount.toLocaleString()}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="grid gap-1 text-sm sm:grid-cols-3">
                        <div>
                          <span className="text-muted-foreground text-xs">{t("finalCommission")}: </span>
                          <span className="font-bold text-primary">{formatCurrency(deal.final_commission)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("employeeShare")}: </span>
                          <span className="font-semibold text-amber-600">{formatCurrency(empRecord?.profit_amount)}</span>
                          <span className="text-[10px] text-muted-foreground"> / {(deal.employee_percentage || 0)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{t("companyNetProfit")}: </span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(deal.company_net_profit)}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(deal.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-end">
                        <p className="text-lg font-bold text-amber-600">{formatCurrency(empRecord?.profit_amount)}</p>
                        <p className="text-[10px] text-muted-foreground">{t("employeeShare")}</p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => router.push(`/finances/${deal.id}`)}>
                        <Eye className="size-3.5" />
                        {t("dealDetails")}
                      </Button>
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
