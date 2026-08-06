"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createDeal, updateDeal } from "@/lib/finance-actions";
import {
  ArrowLeft, Plus, Trash2, Save, Banknote, Users,
  Building2, Percent, ChevronRight, ChevronLeft, Check,
  Eye, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const rtlFlip = "rtl:scale-x-[-1]";
import {
  type ContactType, type DealSide,
  hasBuyer, hasSeller,
  calcAutoCommission,
  calcCompanyNetProfit,
  calcNathryat,
  calcEmployeePool,
  calcEmployeeProfit,
} from "@/lib/finance-types";
import type { DealWithRelations } from "@/lib/finance-types";

type ClientOption = { id: string; customer_name: string; phone: string };
type UnitOption = { id: string; customer_name: string; compound_name: string | null; unit_type: string | null };
type EmployeeOption = { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null };

type EmployeeAllocation = {
  key: string;
  employee_id: string;
  side: DealSide;
  percentage: number;
};

function getEmployeeName(e: { first_name?: string | null; second_name?: string | null }): string {
  return [e.first_name, e.second_name].filter(Boolean).join(" ") || "—";
}

const STEPS = [
  { key: "contactType", label: "contactType" },
  { key: "amounts", label: "partiesAndAmounts" },
  { key: "commission", label: "commission" },
  { key: "split", label: "splitControl" },
  { key: "employees", label: "employeeAllocations" },
] as const;

function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  renderOption,
  getSearchText,
}: {
  options: { id: string; label: string; phone?: string; sub?: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  renderOption?: (o: { id: string; label: string; phone?: string; sub?: string }) => React.ReactNode;
  getSearchText?: (o: { id: string; label: string; phone?: string; sub?: string }) => string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = search
    ? options.filter((o) => {
        const searchLower = search.toLowerCase();
        if (o.label.toLowerCase().includes(searchLower)) return true;
        if (o.phone?.includes(search)) return true;
        if (getSearchText) return getSearchText(o).toLowerCase().includes(searchLower);
        return (o.sub ?? "").toLowerCase().includes(searchLower);
      })
    : options;

  const select = (id: string) => {
    onChange(id);
    const opt = options.find((o) => o.id === id);
    setSearch(opt?.label ?? "");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filtered.length > 0) { e.preventDefault(); select(filtered[0].id); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? search : selected?.label ?? ""}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => { setSearch(""); setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-lg border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover py-1 shadow-xl">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No results</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-sm text-start transition-colors hover:bg-muted",
                  o.id === value && "bg-muted font-medium"
                )}
                onClick={() => select(o.id)}
              >
                {renderOption ? renderOption(o) : o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  mode: "create" | "edit";
  existingDeal?: DealWithRelations | null;
  clients: ClientOption[];
  units: UnitOption[];
  employees: EmployeeOption[];
  onSuccess: () => void;
};

export function DealForm({ mode, existingDeal, clients, units, employees, onSuccess }: Props) {
  const t = useTranslations("Finances");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [contactType, setContactType] = useState<ContactType>((existingDeal?.contact_type as ContactType) || "both");
  const [buyerClientId, setBuyerClientId] = useState(existingDeal?.buyer_client_id || "");
  const [sellerUnitId, setSellerUnitId] = useState(existingDeal?.seller_unit_id || "");
  const [buyerAmount, setBuyerAmount] = useState(existingDeal?.buyer_amount?.toString() || "");
  const [sellerAmount, setSellerAmount] = useState(existingDeal?.seller_amount?.toString() || "");
  const [finalCommission, setFinalCommission] = useState(existingDeal?.final_commission?.toString() || "");
  const [commissionOverridden, setCommissionOverridden] = useState(false);
  const [hasEmployee, setHasEmployee] = useState(existingDeal?.has_employee ?? true);
  const [companyPercentage, setCompanyPercentage] = useState(existingDeal?.company_percentage?.toString() || "70");
  const [employeePercentage, setEmployeePercentage] = useState(existingDeal?.employee_percentage?.toString() || "30");
  const [employeeAllocations, setEmployeeAllocations] = useState<EmployeeAllocation[]>(() => {
    if (existingDeal?.employees) {
      return existingDeal.employees.map((e) => ({
        key: crypto.randomUUID(), employee_id: e.employee_id, side: e.side, percentage: e.percentage,
      }));
    }
    if (!existingDeal) {
      return [{ key: crypto.randomUUID(), employee_id: "", side: "both", percentage: 100 }];
    }
    return [];
  });

  const autoCommission = calcAutoCommission(contactType, buyerAmount ? Number(buyerAmount) : null, sellerAmount ? Number(sellerAmount) : null);
  const finalComm = finalCommission ? Number(finalCommission) : 0;
  const empPct = employeePercentage ? Number(employeePercentage) : 30;
  const activeEmployees = hasEmployee && employeeAllocations.length > 0;
  const employeePool = calcEmployeePool(finalComm, empPct, activeEmployees);
  const compPct = companyPercentage ? Number(companyPercentage) : 70;
  const companyNet = calcCompanyNetProfit(finalComm, compPct, activeEmployees);

  useEffect(() => { if (!commissionOverridden) setFinalCommission(autoCommission.toString()); }, [autoCommission, commissionOverridden]);
  useEffect(() => { setEmployeePercentage((100 - (Number(companyPercentage) || 0)).toString()); }, [companyPercentage]);

  const selectClient = clients.find((c) => c.id === buyerClientId);
  const selectUnit = units.find((u) => u.id === sellerUnitId);
  const selectEmployee = (id: string) => employees.find((e) => e.id === id);

  const clientOpts = clients.map((c) => ({ id: c.id, label: c.customer_name, phone: c.phone }));
  const unitOpts = units.map((u) => ({ id: u.id, label: u.customer_name, sub: [u.compound_name, u.unit_type].filter(Boolean).join(" · ") }));

  const totalEmpPct = employeeAllocations.reduce((s, a) => s + a.percentage, 0);
  const empPctValid = Math.abs(totalEmpPct - 100) < 0.01;

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return !!contactType;
      case 1: {
        const bOk = !hasBuyer(contactType) || (!!buyerClientId && buyerAmount !== "" && Number(buyerAmount) > 0);
        const sOk = !hasSeller(contactType) || (!!sellerUnitId && sellerAmount !== "" && Number(sellerAmount) > 0);
        return bOk && sOk;
      }
      case 2: return finalCommission !== "" && Number(finalCommission) > 0;
      case 3: return companyPercentage !== "" && Number(companyPercentage) > 0 && Number(companyPercentage) < 100;
      case 4: {
        if (!hasEmployee) return true;
        if (employeeAllocations.length === 0) return false;
        if (!empPctValid) return false;
        return !employeeAllocations.some((a) => !a.employee_id);
      }
      default: return true;
    }
  };

  const addEmp = () => {
    setEmployeeAllocations((p) => [...p, {
      key: crypto.randomUUID(), employee_id: "",
      side: contactType === "buyer_only" ? "buyer" : contactType === "seller_only" ? "seller" : "both",
      percentage: p.length === 0 ? 100 : 0,
    }]);
  };
  const removeEmp = (key: string) => setEmployeeAllocations((p) => p.filter((a) => a.key !== key));
  const updateEmp = (key: string, f: Partial<EmployeeAllocation>) => setEmployeeAllocations((p) => p.map((a) => (a.key === key ? { ...a, ...f } : a)));

  const buildInput = () => ({
    contact_type: contactType,
    buyer_client_id: hasBuyer(contactType) ? buyerClientId || null : null,
    seller_unit_id: hasSeller(contactType) ? sellerUnitId || null : null,
    buyer_amount: hasBuyer(contactType) ? (buyerAmount ? Number(buyerAmount) : null) : null,
    seller_amount: hasSeller(contactType) ? (sellerAmount ? Number(sellerAmount) : null) : null,
    final_commission: finalComm,
    company_percentage: Number(companyPercentage),
    employee_percentage: Number(employeePercentage),
    employees: activeEmployees ? employeeAllocations.map((a) => ({ employee_id: a.employee_id, side: a.side, percentage: a.percentage })) : undefined,
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    const r = mode === "create" ? await createDeal(buildInput()) : await updateDeal(existingDeal!.id, buildInput());
    setSubmitting(false);
    if (r.success) {
      toast.success(mode === "create" ? t("createSuccess") : t("updateSuccess"));
      onSuccess(); router.push("/finances");
    } else {
      toast.error(r.error || (mode === "create" ? t("createFailed") : t("updateFailed")));
    }
  };

  const sideLabel = (s: DealSide) => s === "both" ? t("contactBoth") : s === "buyer" ? t("buyerSide") : t("sellerSide");

  const nathryat = calcNathryat(finalComm, compPct, activeEmployees);
  const companyGross = activeEmployees ? Math.round(finalComm * (compPct / 100) * 100) / 100 : finalComm;

  // ── Preview ──
  const Preview = () => (
    <Card className="sticky top-4">
      <CardContent className="p-5 space-y-3 text-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Eye className="size-3.5" /> {t("preview")}
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("contactType")}</span>
          <Badge variant="secondary">{{ both: t("contactBoth"), buyer_only: t("contactBuyerOnly"), seller_only: t("contactSellerOnly") }[contactType]}</Badge>
        </div>

        {hasBuyer(contactType) && selectClient && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("buyer")}</span>
            <span className="font-medium text-xs truncate max-w-[160px]">{selectClient.customer_name}</span>
          </div>
        )}
        {hasSeller(contactType) && selectUnit && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("seller")}</span>
            <span className="font-medium text-xs truncate max-w-[160px]">{selectUnit.customer_name}</span>
          </div>
        )}

        <Separator />

        {/* Commission formulas */}
        <div className="rounded-lg bg-muted/30 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground">{t("commissionFormula")}</p>
          {hasBuyer(contactType) && buyerAmount && (
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{t("buyerPercent")}</span>
              <span className="font-mono">{Number(buyerAmount).toLocaleString()} × 1.5% = {(Number(buyerAmount) * 0.015).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {hasSeller(contactType) && sellerAmount && (
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{t("sellerPercent")}</span>
              <span className="font-mono">{Number(sellerAmount).toLocaleString()} × 2.5% = {(Number(sellerAmount) * 0.025).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1.5">
            <span className="text-muted-foreground font-medium">{t("autoCommission")}</span>
            <span className="font-bold">{autoCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground font-semibold">{t("finalCommission")}</span>
          <span className="font-bold text-primary text-base">{finalComm.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>

        <Separator />

        {activeEmployees ? (
          <>
            {/* Split formula */}
            <div className="rounded-lg bg-muted/30 p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground">{t("splitFormula")}</p>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{t("companyGross")}</span>
                <span className="font-mono">{finalComm.toLocaleString(undefined, { minimumFractionDigits: 2 })} × {companyPercentage}% = {companyGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{t("employeePool")}</span>
                <span className="font-mono">{finalComm.toLocaleString(undefined, { minimumFractionDigits: 2 })} × {employeePercentage}% = {employeePool.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("companyGross")} ({companyPercentage}%)</span>
              <span>{companyGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-destructive">
              <span className="text-muted-foreground">{t("nathryat")} (10%)</span>
              <span>-{nathryat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground font-semibold">{t("companyNetProfit")}</span>
              <span className="font-bold text-emerald-600">{companyNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground font-semibold">{t("employeeShare")} ({employeePercentage}%)</span>
              <span className="font-bold text-amber-600">{employeePool.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {employeeAllocations.filter(a => a.employee_id).map((a) => {
              const e = selectEmployee(a.employee_id);
              const profit = calcEmployeeProfit(employeePool, a.percentage);
              return e ? (
                <div key={a.key} className="flex justify-between ps-3 text-[11px]">
                  <span className="text-muted-foreground">{getEmployeeName(e)} ({sideLabel(a.side)} - {a.percentage}%)</span>
                  <span className="font-medium">{profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ) : null;
            })}
          </>
        ) : (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t("companyNetProfit")}</span>
            <span className="font-bold text-emerald-600">{companyNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/finances")}>
            <ArrowLeft className={`size-5 ${rtlFlip}`} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{mode === "create" ? t("addDeal") : t("editDeal")}</h1>
            <p className="text-sm text-muted-foreground">{t("dealFormDesc")}</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 flex-1">
            <button
              onClick={() => i < step ? setStep(i) : undefined}
              className={cn(
                "h-2 flex-1 rounded-full transition-all",
                i <= step ? "bg-primary" : "bg-muted"
              )}
            />
          </div>
        ))}
        <span className="ms-3 text-xs text-muted-foreground shrink-0">{step + 1}/{STEPS.length}</span>
      </div>

      {/* Main Layout: two columns on desktop */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Left: Form */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Step 0: Contact Type */}
          {step === 0 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="size-5 text-blue-600" /> {t("contactType")}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {(["both", "buyer_only", "seller_only"] as ContactType[]).map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => { setContactType(ct); setCommissionOverridden(false); }}
                      className={cn(
                        "rounded-xl border-2 p-6 text-center transition-all",
                        contactType === ct ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                      )}
                    >
                      <div className="text-base font-semibold">{{ both: t("contactBoth"), buyer_only: t("contactBuyerOnly"), seller_only: t("contactSellerOnly") }[ct]}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Parties & Amounts */}
          {step === 1 && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="size-5 text-emerald-600" /> {t("partiesAndAmounts")}
                </h3>
                {hasBuyer(contactType) && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">{t("buyer")}</Label>
                    <SearchableDropdown
                      options={clientOpts}
                      value={buyerClientId}
                      onChange={setBuyerClientId}
                      placeholder={t("searchClient")}
                      renderOption={(o) => (
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium">{o.label}</span>
                          {o.phone && <span className="text-[11px] text-muted-foreground" dir="ltr">{o.phone}</span>}
                        </div>
                      )}
                    />
                    <div className="relative">
                      <Input type="number" placeholder={t("buyerAmount")} value={buyerAmount} onChange={(e) => setBuyerAmount(e.target.value)} className="ps-10 h-11" dir="ltr" />
                      <Banknote className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                )}
                {hasSeller(contactType) && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">{t("seller")}</Label>
                    <SearchableDropdown
                      options={unitOpts}
                      value={sellerUnitId}
                      onChange={setSellerUnitId}
                      placeholder={t("searchUnit")}
                      renderOption={(o) => (
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium">{o.label}</span>
                          {o.sub && <span className="text-[11px] text-muted-foreground">{o.sub}</span>}
                        </div>
                      )}
                    />
                    <div className="relative">
                      <Input type="number" placeholder={t("sellerAmount")} value={sellerAmount} onChange={(e) => setSellerAmount(e.target.value)} className="ps-10 h-11" dir="ltr" />
                      <Banknote className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Commission */}
          {step === 2 && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Percent className="size-5 text-amber-600" /> {t("commission")}
                </h3>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("autoCommission")}</span>
                    <span className="text-xl font-bold">{autoCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {hasBuyer(contactType) && buyerAmount && "1.5% × " + t("buyerAmount")}
                    {hasBuyer(contactType) && buyerAmount && hasSeller(contactType) && sellerAmount && " + "}
                    {hasSeller(contactType) && sellerAmount && "2.5% × " + t("sellerAmount")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("finalCommission")}</Label>
                  <div className="relative">
                    <Input type="number" placeholder="0.00" value={finalCommission} onChange={(e) => { setFinalCommission(e.target.value); setCommissionOverridden(true); }} className="ps-10 h-12 text-lg font-bold" dir="ltr" />
                    <Banknote className="absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t("commissionHint")}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Split */}
          {step === 3 && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Percent className="size-5 text-purple-600" /> {t("splitControl")}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("companyShare")} (%)</Label>
                    <Input type="number" value={companyPercentage} onChange={(e) => setCompanyPercentage(e.target.value)} className="h-11 text-lg font-bold" dir="ltr" min={1} max={99} />
                  </div>
                  <span className="pt-5 text-2xl font-light text-muted-foreground">/</span>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("employeeShare")} (%)</Label>
                    <Input type="number" value={employeePercentage} disabled className="h-11 text-lg font-bold bg-muted" dir="ltr" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">{t("splitHint")}</p>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Employees */}
          {step === 4 && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="size-5 text-amber-600" /> {t("hasEmployee")}
                </h3>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setHasEmployee(true); if (employeeAllocations.length === 0) addEmp(); }}
                    className={cn("flex-1 rounded-xl border-2 p-4 text-center transition-all", hasEmployee ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-muted-foreground/30")}>
                    <span className="text-sm font-semibold">{t("yes")}</span>
                  </button>
                  <button type="button" onClick={() => { setHasEmployee(false); setEmployeeAllocations([]); }}
                    className={cn("flex-1 rounded-xl border-2 p-4 text-center transition-all", !hasEmployee ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-muted-foreground/30")}>
                    <span className="text-sm font-semibold">{t("no")}</span>
                  </button>
                </div>
                {hasEmployee && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{t("employeeAllocations")}</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addEmp} className="gap-1"><Plus className="size-3.5" /> {t("addEmployee")}</Button>
                    </div>
                    {employeeAllocations.length > 0 && (
                      <p className={cn("text-xs font-medium", empPctValid ? "text-emerald-600" : "text-destructive")}>
                        {t("totalPercentage")}: {totalEmpPct}% {!empPctValid && t("mustBe100")}
                      </p>
                    )}
                    <div className="space-y-2">
                      {employeeAllocations.map((alloc) => {
                        const emp = selectEmployee(alloc.employee_id);
                        const profit = calcEmployeeProfit(employeePool, alloc.percentage);
                        return (
                          <div key={alloc.key} className="flex items-center gap-3 rounded-xl border p-3">
                            <Avatar className="size-9 rounded-lg shrink-0">
                              <AvatarImage src={emp?.avatar_url ?? undefined} />
                              <AvatarFallback className="rounded-lg bg-primary/10 text-[10px]">{emp ? getEmployeeName(emp).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <select value={alloc.employee_id} onChange={(e) => updateEmp(alloc.key, { employee_id: e.target.value })} className="w-full rounded-md border bg-card px-2 py-1.5 text-xs">
                                <option value="">{t("selectEmployee")}</option>
                                {employees.map((e) => (<option key={e.id} value={e.id}>{getEmployeeName(e)}</option>))}
                              </select>
                              <div className="flex gap-2">
                                <select value={alloc.side} onChange={(e) => updateEmp(alloc.key, { side: e.target.value as DealSide })} className="rounded-md border bg-card px-2 py-1.5 text-xs">
                                  {contactType === "both" && <option value="both">{t("contactBoth")}</option>}
                                  {hasBuyer(contactType) && <option value="buyer">{t("buyerSide")}</option>}
                                  {hasSeller(contactType) && <option value="seller">{t("sellerSide")}</option>}
                                </select>
                                <div className="relative flex-1">
                                  <Input type="number" placeholder="%" value={alloc.percentage || ""} onChange={(e) => updateEmp(alloc.key, { percentage: Number(e.target.value) || 0 })} className="h-7 text-xs pe-6" dir="ltr" />
                                  <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                                </div>
                              </div>
                              {emp && alloc.percentage > 0 && (
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] text-emerald-600">{t("estimatedProfit")}: {profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/finances/employee/${alloc.employee_id}`)}
                                    className="text-[10px] text-primary hover:underline"
                                  >
                                    {t("viewDetails")}
                                  </button>
                                </div>
                              )}
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeEmp(alloc.key)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : router.push("/finances")} className="gap-1">
              <ChevronLeft className={`size-4 ${rtlFlip}`} /> {step === 0 ? t("cancel") : t("back")}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="flex-1 gap-1">
                {t("next")} <ChevronRight className={`size-4 ${rtlFlip}`} />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || submitting} className="flex-1 gap-2">
                <Save className="size-4" /> {submitting ? "..." : mode === "create" ? t("saveDeal") : t("updateDeal")}
              </Button>
            )}
          </div>
        </div>

        {/* Right: Preview Panel (desktop only) */}
        <div className="hidden lg:block w-[360px] shrink-0">
          <Preview />
        </div>
      </div>
    </div>
  );
}
