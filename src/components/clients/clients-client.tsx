"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Calendar, SlidersHorizontal } from "lucide-react";
import { ClientTable } from "@/components/clients/client-table";
import type { ColumnConfig } from "@/lib/client-config-actions";

type ClientRow = Record<string, unknown> & { id: string; custom_fields: Record<string, unknown> };
type Option = { id: string; name: string };

interface ClientsClientProps {
  initialClients: ClientRow[];
  columns: ColumnConfig[];
  customColumns: ColumnConfig[];
  locale: string;
  isAdmin: boolean;
  userId: string;
  creatorMap: Map<string, string>;
  employeeMap: Map<string, string>;
  uniquePaymentMethods: string[];
  uniqueUnitTypes: string[];
  uniqueSources: string[];
  uniqueAreas: string[];
  uniqueDevelopers: string[];
  uniqueBedrooms: string[];
  budgetRange: { min: number; max: number } | null;
  creatorOptions: Option[];
  employeeOptions: Option[];
}

const selectClass = "flex h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground [&>option]:text-foreground [&>option]:bg-background";
const dateInputClass = "h-8 w-36 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground";

function toDateOnly(d: string) { if (!d) return ""; const dt = new Date(d); return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10); }

export function ClientsClient({
  initialClients, columns, customColumns, locale, isAdmin, userId, creatorMap, employeeMap,
  uniquePaymentMethods, uniqueUnitTypes, uniqueSources, uniqueAreas, uniqueDevelopers, uniqueBedrooms,
  budgetRange, creatorOptions, employeeOptions,
}: ClientsClientProps) {
  const t = useTranslations("Clients");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [unitType, setUnitType] = useState("all");
  const [source, setSource] = useState("all");
  const [area, setArea] = useState("all");
  const [developer, setDeveloper] = useState("all");
  const [bedrooms, setBedrooms] = useState("all");
  const [assigned, setAssigned] = useState("all");
  const [createdBy, setCreatedBy] = useState("all");
  const [budgetFrom, setBudgetFrom] = useState("");
  const [budgetTo, setBudgetTo] = useState("");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [lastContactFrom, setLastContactFrom] = useState("");
  const [lastContactTo, setLastContactTo] = useState("");
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  const [showCount, setShowCount] = useState(50);

  const dateRef = useRef<HTMLDivElement>(null);
  const budgetRef = useRef<HTMLDivElement>(null);

  const dateActive = !!(lastContactFrom || lastContactTo);
  const budgetActive = !!(budgetFrom || budgetTo);

  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false);
      if (budgetRef.current && !budgetRef.current.contains(e.target as Node)) setBudgetOpen(false);
    }
    if (dateOpen || budgetOpen) { document.addEventListener("mousedown", clickOut); return () => document.removeEventListener("mousedown", clickOut); }
  }, [dateOpen, budgetOpen]);

  const selectCustom = customColumns.filter((c) => c.enabled && c.type === "select");

  const filtered = useMemo(() => {
    let result = initialClients;
    if (search) {
      const term = search.toLowerCase();
      result = result.filter((c) =>
        [c.customer_name, c.phone, c.phone_alt, c.additional_notes]
          .some((v) => (v ? String(v).toLowerCase().includes(term) : false))
      );
    }
    if (paymentMethod !== "all") result = result.filter((c) => c.payment_method === paymentMethod);
    if (unitType !== "all") result = result.filter((c) => c.unit_type === unitType);
    if (source !== "all") result = result.filter((c) => c.source === source);
    if (area !== "all") result = result.filter((c) => c.preferred_area === area);
    if (developer !== "all") result = result.filter((c) => c.preferred_developer === developer);
    if (bedrooms !== "all") result = result.filter((c) => c.bedrooms === bedrooms);
    if (assigned !== "all") result = result.filter((c) => c.assigned_employee === assigned);
    if (createdBy !== "all") result = result.filter((c) => c.created_by === createdBy);
    if (budgetFrom) { const m = Number(budgetFrom); if (!isNaN(m)) result = result.filter((c) => (Number(c.budget_from) || 0) >= m); }
    if (budgetTo) { const m = Number(budgetTo); if (!isNaN(m)) result = result.filter((c) => (Number(c.budget_from) || 0) <= m); }
    if (lastContactFrom) { const f = toDateOnly(lastContactFrom); if (f) result = result.filter((c) => c.last_contact_date ? toDateOnly(String(c.last_contact_date)) >= f : false); }
    if (lastContactTo) { const t = toDateOnly(lastContactTo); if (t) result = result.filter((c) => c.last_contact_date ? toDateOnly(String(c.last_contact_date)) <= t : false); }
    for (const col of selectCustom) {
      const v = customFilters[col.key];
      if (v && v !== "all") { const term = v.toLowerCase(); result = result.filter((c) => { const cv = (c.custom_fields as Record<string, unknown>)?.[col.key]; return cv ? String(cv).toLowerCase().includes(term) : false; }); }
    }
    return result;
  }, [initialClients, search, paymentMethod, unitType, source, area, developer, bedrooms, assigned, createdBy, budgetFrom, budgetTo, lastContactFrom, lastContactTo, customFilters, selectCustom]);

  const visible = useMemo(() => filtered.slice(0, showCount), [filtered, showCount]);

  const clearAll = () => {
    setSearch(""); setPaymentMethod("all"); setUnitType("all"); setSource("all"); setArea("all");
    setDeveloper("all"); setBedrooms("all"); setAssigned("all"); setCreatedBy("all");
    setBudgetFrom(""); setBudgetTo(""); setLastContactFrom(""); setLastContactTo("");
    setCustomFilters({}); setShowCount(50);
  };

  const hasActive = !!(search || paymentMethod !== "all" || unitType !== "all" || source !== "all" || area !== "all" || developer !== "all" || bedrooms !== "all" || assigned !== "all" || createdBy !== "all" || budgetFrom || budgetTo || lastContactFrom || lastContactTo || Object.values(customFilters).some((v) => v && v !== "all"));

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setShowCount(50); }} placeholder={t("filterSearch")} className="ps-9" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setShowCount(50); }} className={selectClass}>
            <option value="all">{t("paymentMethod")}</option>
            {uniquePaymentMethods.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={unitType} onChange={(e) => { setUnitType(e.target.value); setShowCount(50); }} className={selectClass}>
            <option value="all">{t("unitType")}</option>
            {uniqueUnitTypes.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={source} onChange={(e) => { setSource(e.target.value); setShowCount(50); }} className={selectClass}>
            <option value="all">{t("source")}</option>
            {uniqueSources.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={area} onChange={(e) => { setArea(e.target.value); setShowCount(50); }} className={selectClass}>
            <option value="all">{t("preferredArea")}</option>
            {uniqueAreas.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={developer} onChange={(e) => { setDeveloper(e.target.value); setShowCount(50); }} className={selectClass}>
            <option value="all">{t("preferredDeveloper")}</option>
            {uniqueDevelopers.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={bedrooms} onChange={(e) => { setBedrooms(e.target.value); setShowCount(50); }} className={selectClass}>
            <option value="all">{t("bedrooms")}</option>
            {uniqueBedrooms.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>

          {budgetRange && (
            <div className="relative" ref={budgetRef}>
              <button type="button" onClick={() => setBudgetOpen((p) => !p)}
                className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${budgetActive ? "border-primary/50 bg-primary/10 text-primary" : "border-input bg-background text-foreground hover:bg-muted/50"}`}>
                <SlidersHorizontal className="h-3.5 w-3.5" />{t("budget")}
              </button>
              {budgetOpen && (
                <div className="absolute start-0 top-full z-50 mt-1 rounded-md border bg-background p-3 shadow-lg">
                  <p className="mb-2 text-xs font-semibold">{t("budget")}</p>
                  <div className="flex items-center gap-1">
                    <Input type="number" placeholder={t("budget")} value={budgetFrom} onChange={(e) => { setBudgetFrom(e.target.value); setShowCount(50); }} className="h-8 w-24 text-xs" />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input type="number" placeholder="max" value={budgetTo} onChange={(e) => { setBudgetTo(e.target.value); setShowCount(50); }} className="h-8 w-24 text-xs" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative" ref={dateRef}>
            <button type="button" onClick={() => setDateOpen((p) => !p)}
              className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${dateActive ? "border-primary/50 bg-primary/10 text-primary" : "border-input bg-background text-foreground hover:bg-muted/50"}`}>
              <Calendar className="h-3.5 w-3.5" />{t("lastContactDate")}
            </button>
            {dateOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDateOpen(false)} />
                <div className="absolute start-0 top-full z-50 mt-1 rounded-lg border bg-popover p-4 shadow-xl">
                  <p className="mb-3 text-xs font-semibold">{t("lastContactDate")}</p>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={lastContactFrom} onChange={(e) => { setLastContactFrom(e.target.value); setShowCount(50); }} className="h-8 w-36 text-xs" />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input type="date" value={lastContactTo} onChange={(e) => { setLastContactTo(e.target.value); setShowCount(50); }} className="h-8 w-36 text-xs" />
                  </div>
                </div>
              </>
            )}
          </div>

          {employeeOptions.length > 0 && (
            <select value={assigned} onChange={(e) => { setAssigned(e.target.value); setShowCount(50); }} className={selectClass}>
              <option value="all">{t("assignedEmployee")}</option>
              {employeeOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}

          {isAdmin && creatorOptions.length > 0 && (
            <select value={createdBy} onChange={(e) => { setCreatedBy(e.target.value); setShowCount(50); }} className={selectClass}>
              <option value="all">{t("createdBy")}</option>
              {creatorOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}

          {selectCustom.map((col) => (
            <select key={col.key} value={customFilters[col.key] ?? "all"} onChange={(e) => { setCustomFilters((p) => ({ ...p, [col.key]: e.target.value })); setShowCount(50); }} className={selectClass}>
              <option value="all">{col.label_en}</option>
              {(col.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}

          {hasActive && <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 gap-1 text-xs"><X className="h-3 w-3" />{t("filterAll")}</Button>}
        </div>
      </div>

      <ClientTable columns={columns} clients={visible} locale={locale} creatorMap={creatorMap} employeeMap={employeeMap} userId={userId} />

      {showCount < filtered.length && (
        <div className="flex justify-center pt-4"><Button variant="outline" onClick={() => setShowCount((c) => c + 50)}>Show More ({filtered.length - showCount} remaining)</Button></div>
      )}
    </>
  );
}
