"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { DealWithRelations } from "@/lib/finance-types";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Pencil,
  Users,
  Building2,
  Banknote,
  Percent,
  Phone,
  CalendarDays,
  MapPin,
  Home,
  ChevronRight,
} from "lucide-react";

const rtlFlip = "rtl:scale-x-[-1]";

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function getEmployeeName(emp: { first_name?: string | null; second_name?: string | null }): string {
  return [emp.first_name, emp.second_name].filter(Boolean).join(" ") || "—";
}

export function DealDetailsPage({ deal }: { deal: DealWithRelations }) {
  const t = useTranslations("Finances");
  const tProps = useTranslations("Properties");
  const tClients = useTranslations("Clients");
  const router = useRouter();

  const contactTypeLabel = {
    both: t("contactBoth"), buyer_only: t("contactBuyerOnly"), seller_only: t("contactSellerOnly"),
  }[deal.contact_type] || deal.contact_type;

  const client = deal.buyer_client;
  const unit = deal.seller_unit;

  const hasEmp = deal.has_employee && deal.employees && deal.employees.length > 0;
  const empPct = deal.employee_percentage || 0;
  const compPct = deal.company_percentage || 70;
  const employeePool = deal.final_commission * (empPct / 100);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/finances")}>
            <ArrowLeft className={`size-5 ${rtlFlip}`} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("dealDetails")}</h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(deal.created_at, "ar")}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push(`/finances/${deal.id}/edit`)} className="gap-2">
          <Pencil className="size-4" />
          {t("editDeal")}
        </Button>
      </div>

      {/* Deal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("summary")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm pb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("contactType")}</span>
            <Badge variant="secondary">{contactTypeLabel}</Badge>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("finalCommission")}</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(deal.final_commission)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("commissionSum")}</span>
            <span className="font-medium">{formatCurrency(deal.auto_commission)}</span>
          </div>

          {deal.buyer_amount != null && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("buyerAmount")}</span>
                <span className="font-medium">{deal.buyer_amount.toLocaleString()}</span>
              </div>
              {deal.buyer_commission != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("buyerCommission")}</span>
                  <span className="font-medium text-blue-600">{deal.buyer_commission.toLocaleString()}</span>
                </div>
              )}
            </>
          )}
          {deal.seller_amount != null && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("sellerAmount")}</span>
                <span className="font-medium">{deal.seller_amount.toLocaleString()}</span>
              </div>
              {deal.seller_commission != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("sellerCommission")}</span>
                  <span className="font-medium text-emerald-600">{deal.seller_commission.toLocaleString()}</span>
                </div>
              )}
            </>
          )}

          <Separator />

          {hasEmp ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("companyGross")} ({compPct}%)</span>
                <span className="font-medium">{formatCurrency(deal.final_commission * (compPct / 100))}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span className="text-muted-foreground">{t("nathryat")} (10%)</span>
                <span className="font-medium">-{formatCurrency(deal.nathryat || 0)}</span>
              </div>
              {deal.expenses != null && deal.expenses > 0 && (
                <div className="flex justify-between text-destructive">
                  <span className="text-muted-foreground">{t("expenses")}</span>
                  <span className="font-medium">-{formatCurrency(deal.expenses)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("companyNetProfit")}</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(deal.company_net_profit)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("employeeShare")} ({empPct}%)</span>
                <span className="font-semibold text-amber-600">{formatCurrency(employeePool)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("companyNetProfit")}</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(deal.company_net_profit)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employees */}
      {hasEmp && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4 text-amber-600" />
              {t("employeesTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {deal.employees!.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <Avatar className="size-10 rounded-xl">
                    <AvatarImage src={emp.profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-xs">
                      {getEmployeeName(emp.profile).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{getEmployeeName(emp.profile)}</p>
                    <p className="text-xs text-muted-foreground">
                      {emp.side === "buyer" ? t("buyerSide") : emp.side === "seller" ? t("sellerSide") : t("contactBoth")} · {emp.percentage}%
                    </p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(emp.profit_amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Info */}
      {client && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4 text-blue-600" />
              {t("buyer")}: {deal.buyer_name || client.customer_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {client.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span dir="ltr">{client.phone}</span>
                </div>
              )}
              {client.phone_alt && (
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span dir="ltr">{client.phone_alt}</span>
                </div>
              )}
              {client.budget_from != null && client.budget_to != null && (
                <div className="flex items-center gap-2">
                  <Banknote className="size-3.5 text-muted-foreground" />
                  <span>{client.budget_from.toLocaleString()} - {client.budget_to.toLocaleString()}</span>
                </div>
              )}
              {client.payment_method && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{tClients("paymentMethod")}:</span>
                  <span>{client.payment_method}</span>
                </div>
              )}
              {client.preferred_area && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span>{client.preferred_area}</span>
                </div>
              )}
              {client.unit_type && (
                <div className="flex items-center gap-2">
                  <Home className="size-3.5 text-muted-foreground" />
                  <span>{client.unit_type}</span>
                </div>
              )}
              {client.bedrooms && (
                <div className="flex items-center gap-2">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <span>{client.bedrooms}</span>
                </div>
              )}
              {client.preferred_developer && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{tClients("preferredDeveloper")}:</span>
                  <span>{client.preferred_developer}</span>
                </div>
              )}
              {client.source && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{tClients("source")}:</span>
                  <span>{client.source}</span>
                </div>
              )}
              {client.seriousness_rating != null && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{tClients("seriousnessRating")}:</span>
                  <span>{client.seriousness_rating}/10</span>
                </div>
              )}
              {client.last_contact_date && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-3.5 text-muted-foreground" />
                  <span>{formatDate(client.last_contact_date, "ar")}</span>
                </div>
              )}
            </div>
            {client.additional_notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{tClients("additionalNotes")}:</p>
                  <p className="text-sm whitespace-pre-wrap">{client.additional_notes}</p>
                </div>
              </>
            )}
            <div className="text-[11px] text-muted-foreground">
              {tClients("memberSince")}: {formatDate(client.created_at, "ar")}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unit Info */}
      {unit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="size-4 text-emerald-600" />
              {t("seller")}: {deal.seller_name || unit.customer_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {unit.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground" />
                  <span dir="ltr">{unit.phone}</span>
                </div>
              )}
              {unit.compound_name && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span>{unit.compound_name}</span>
                </div>
              )}
              {unit.area && (
                <div className="flex items-center gap-2">
                  <Home className="size-3.5 text-muted-foreground" />
                  <span>{unit.area} m²</span>
                </div>
              )}
              {unit.building_number && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{tProps("buildingNumber")}:</span>
                  <span>{unit.building_number}</span>
                </div>
              )}
              {unit.finishing_status && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{tProps("finishingStatus")}:</span>
                  <span>{unit.finishing_status}</span>
                </div>
              )}
              {unit.rent_sale && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{tProps("rentSale")}:</span>
                  <span>{unit.rent_sale}</span>
                </div>
              )}
              {unit.unit_type && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{tProps("unitType")}:</span>
                  <span>{unit.unit_type}</span>
                </div>
              )}
              {unit.cash_required != null && (
                <div className="flex items-center gap-2">
                  <Banknote className="size-3.5 text-muted-foreground" />
                  <span dir="ltr">{unit.cash_required.toLocaleString()}</span>
                </div>
              )}
              {unit.remaining != null && (
                <div className="flex items-center gap-2">
                  <Banknote className="size-3.5 text-muted-foreground" />
                  <span dir="ltr">{unit.remaining.toLocaleString()}</span>
                </div>
              )}
              {unit.last_contact_date && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-3.5 text-muted-foreground" />
                  <span>{formatDate(unit.last_contact_date, "ar")}</span>
                </div>
              )}
            </div>
            {(unit.additional_notes || unit.feedback) && <Separator />}
            {unit.additional_notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{tProps("additionalNotes")}:</p>
                <p className="text-sm whitespace-pre-wrap">{unit.additional_notes}</p>
              </div>
            )}
            {unit.feedback && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">{tProps("feedback")}:</p>
                <p className="text-sm whitespace-pre-wrap">{unit.feedback}</p>
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">
              {tProps("createdAt")}: {formatDate(unit.created_at, "ar")}
            </div>
          </CardContent>
        </Card>
      )}
      {!client && deal.buyer_name && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="size-4 text-blue-600" />{t("buyer")}: {deal.buyer_name}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm pb-4">
            {deal.buyer_amount != null && <div className="flex justify-between"><span className="text-muted-foreground">{t("buyerAmount")}</span><span className="font-medium">{deal.buyer_amount.toLocaleString()}</span></div>}
            {deal.buyer_commission != null && <div className="flex justify-between"><span className="text-muted-foreground">{t("buyerCommission")}</span><span className="font-medium text-blue-600">{deal.buyer_commission.toLocaleString()}</span></div>}
          </CardContent>
        </Card>
      )}
      {!unit && deal.seller_name && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="size-4 text-emerald-600" />{t("seller")}: {deal.seller_name}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm pb-4">
              {deal.seller_amount != null && <div className="flex justify-between"><span className="text-muted-foreground">{t("sellerAmount")}</span><span className="font-medium">{deal.seller_amount.toLocaleString()}</span></div>}
              {deal.building_number && <div className="flex justify-between"><span className="text-muted-foreground">{t("buildingNumber")}</span><span className="font-medium">{deal.building_number}</span></div>}
              {deal.apartment_number && <div className="flex justify-between"><span className="text-muted-foreground">{t("apartmentNumber")}</span><span className="font-medium">{deal.apartment_number}</span></div>}
              {deal.compound_name && <div className="flex justify-between"><span className="text-muted-foreground">{t("compoundName")}</span><span className="font-medium">{deal.compound_name}</span></div>}
              {deal.seller_commission != null && <div className="flex justify-between"><span className="text-muted-foreground">{t("sellerCommission")}</span><span className="font-medium text-emerald-600">{deal.seller_commission.toLocaleString()}</span></div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
