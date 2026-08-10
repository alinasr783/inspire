"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Banknote, ExternalLink, User, Building2, Wallet, TrendingUp, Receipt, Percent } from "lucide-react";
import { useEmployeeDealsQuery } from "@/hooks/queries/use-team-query";
import { format } from "date-fns";

export function EmployeeDealsTab({ employeeId }: { employeeId: string }) {
  const t = useTranslations("Team");
  const { data: deals, isLoading } = useEmployeeDealsQuery(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalCommission = (deals ?? []).reduce((sum, d) => sum + (d.employee_profit ?? 0), 0);
  const totalCompanyProfit = (deals ?? []).reduce((sum, d) => sum + (d.company_net_profit ?? 0), 0);

  const contactTypeLabels: Record<string, string> = {
    both: "طرفين",
    buyer_only: "مشتري فقط",
    seller_only: "بائع فقط",
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
                <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عمولة الموظف</p>
                <p className="text-xl font-bold text-amber-600">{totalCommission.toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">صافي ربح الشركة</p>
                <p className="text-xl font-bold text-emerald-600">{totalCompanyProfit.toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
                <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الصفقات</p>
                <p className="text-xl font-bold">{deals?.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            {t("dealsTab")} ({deals?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!deals || deals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noDeals")}</p>
          ) : (
            <div className="space-y-3">
              {deals.map((d) => (
                <Card key={d.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[11px]">
                            {contactTypeLabels[d.contact_type] ?? d.contact_type}
                          </Badge>
                          {d.compound_name && (
                            <Badge variant="secondary" className="text-[11px]">
                              {d.compound_name} - {d.building_number}
                            </Badge>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">مشتري</p>
                              <p className="text-sm font-medium truncate">{d.buyer_name || "—"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">بائع</p>
                              <p className="text-sm font-medium truncate">{d.seller_name || "—"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="rounded-lg bg-muted/30 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">العمولة الكلية</p>
                            <p className="text-sm font-bold">{Number(d.final_commission).toLocaleString()} ج.م</p>
                          </div>
                          <div className="rounded-lg bg-amber-50/50 dark:bg-amber-950/20 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">عمولة الموظف</p>
                            <p className="text-sm font-bold text-amber-600">
                              {Number(d.employee_profit).toLocaleString()} ج.م
                            </p>
                          </div>
                          <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">صافي الشركة</p>
                            <p className="text-sm font-bold text-emerald-600">
                              {Number(d.company_net_profit).toLocaleString()} ج.م
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">النثرية</p>
                            <p className="text-sm font-bold">{Number(d.nathryat).toLocaleString()} ج.م</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            نسبة الموظف: {d.employee_percentage}% | الشركة: {d.company_percentage}%
                          </span>
                          {d.expenses > 0 && (
                            <span>مصاريف: {Number(d.expenses).toLocaleString()} ج.م</span>
                          )}
                          <span>{format(new Date(d.created_at), "yyyy/MM/dd")}</span>
                        </div>
                      </div>

                      <Link
                        href={`/finances/${d.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                      >
                        {t("viewAll")}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
