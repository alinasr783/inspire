"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { FinanceSummary, EmployeeProfitSummary } from "@/lib/finance-types";
import { Banknote, TrendingUp, Building2, Users, ChevronRight } from "lucide-react";

const rtlFlip = "rtl:scale-x-[-1]";

function formatCurrency(v: number): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({
  icon: Icon, label, value, color, sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
        <span style={color ? { color } : undefined}><Icon className="size-4" /></span>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function FinanceSummary({ summary }: { summary: FinanceSummary }) {
  const t = useTranslations("Finances");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={TrendingUp} label={t("totalDeals")} value={summary.total_deals.toString()} color="#276ef1" />
        <StatCard icon={Banknote} label={t("totalCommission")} value={formatCurrency(summary.total_commission)} color="#06c167" />
        <StatCard icon={Building2} label={t("companyNetProfit")} value={formatCurrency(summary.total_company_net_profit)} color="#8b5cf6" />
        <StatCard icon={Users} label={t("employeeProfit")} value={formatCurrency(summary.total_employee_profit)} color="#f59e0b" />
      </div>

      {summary.employee_profits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-amber-600" />
              {t("employeeProfits")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.employee_profits.map((emp) => (
                <EmployeeCard key={emp.employee_id} emp={emp} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmployeeCard({ emp }: { emp: EmployeeProfitSummary }) {
  const t = useTranslations("Finances");
  const router = useRouter();
  const name = [emp.first_name, emp.second_name].filter(Boolean).join(" ") || "—";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <button
      onClick={() => router.push(`/finances/employee/${emp.employee_id}`)}
      className="flex items-center gap-3 rounded-xl border p-3 text-start transition-colors hover:bg-muted/50 hover:border-primary/30 w-full"
    >
      <Avatar className="size-10 rounded-xl">
        <AvatarImage src={emp.avatar_url ?? undefined} />
        <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-semibold">{initials || "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{t("dealsCount", { count: emp.deal_count })}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-emerald-600">{formatCurrency(emp.total_profit)}</p>
        <p className="text-[11px] text-muted-foreground">{t("netProfit")}</p>
      </div>
      <ChevronRight className={`size-4 text-muted-foreground shrink-0 ${rtlFlip}`} />
    </button>
  );
}
