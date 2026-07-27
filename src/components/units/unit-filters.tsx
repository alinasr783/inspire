"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Calendar } from "lucide-react";
import type { ColumnConfig } from "@/lib/unit-config-actions";

interface UnitFiltersProps {
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  clearAll: () => void;
  hasActiveFilters: boolean;
  customColumns: ColumnConfig[];
  uniqueFinishing: string[];
  uniqueRentSale: string[];
  uniqueUnitType: string[];
  uniqueCompounds: string[];
  uniqueAreas: string[];
  employeeOptions?: { id: string; name: string }[];
  rangeLimits?: {
    cash_required: { min: number; max: number } | null;
    remaining: { min: number; max: number } | null;
  };
}

const selectClass =
  "flex h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground [&>option]:text-foreground [&>option]:bg-background";

export function UnitFilters({
  filters,
  setFilter,
  clearAll,
  hasActiveFilters,
  customColumns,
  uniqueFinishing,
  uniqueRentSale,
  uniqueUnitType,
  uniqueCompounds,
  uniqueAreas,
  employeeOptions,
  rangeLimits,
}: UnitFiltersProps) {
  const t = useTranslations("Properties");
  const [dateOpen, setDateOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  const dateActive = !!(filters.last_contact_from || filters.last_contact_to);

  useEffect(() => {
    function clickOut(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateOpen(false);
      }
    }
    if (dateOpen) {
      document.addEventListener("mousedown", clickOut);
    }
    return () => document.removeEventListener("mousedown", clickOut);
  }, [dateOpen]);

  const val = (key: string, fallback = "all") => filters[key] ?? fallback;

  return (
    <div className="mb-4 space-y-3">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={val("q", "")}
          onChange={(e) => setFilter("q", e.target.value)}
          placeholder={t("filterSearchProps")}
          className="ps-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={val("finishing_status")}
          onChange={(e) => setFilter("finishing_status", e.target.value)}
          className={selectClass}
        >
          <option value="all">{t("finishingStatus")}</option>
          {uniqueFinishing.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>

        <select
          value={val("rent_sale")}
          onChange={(e) => setFilter("rent_sale", e.target.value)}
          className={selectClass}
        >
          <option value="all">{t("rentSale")}</option>
          {uniqueRentSale.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>

        <select
          value={val("unit_type")}
          onChange={(e) => setFilter("unit_type", e.target.value)}
          className={selectClass}
        >
          <option value="all">{t("unitType")}</option>
          {uniqueUnitType.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>

        <select
          value={val("compound_name")}
          onChange={(e) => setFilter("compound_name", e.target.value)}
          className={selectClass}
        >
          <option value="all">{t("compoundName")}</option>
          {uniqueCompounds.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <select
          value={val("area")}
          onChange={(e) => setFilter("area", e.target.value)}
          className={selectClass}
        >
          <option value="all">{t("area")}</option>
          {uniqueAreas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {employeeOptions && employeeOptions.length > 0 && (
          <select
            value={val("assigned_employee")}
            onChange={(e) => setFilter("assigned_employee", e.target.value)}
            className={selectClass}
          >
            <option value="all">Assigned Employee</option>
            {employeeOptions.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}

        {rangeLimits?.cash_required && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder={t("cashRequired")}
              value={val("cash_from", "")}
              onChange={(e) => setFilter("cash_from", e.target.value)}
              className="h-8 w-24 text-xs"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="max"
              value={val("cash_to", "")}
              onChange={(e) => setFilter("cash_to", e.target.value)}
              className="h-8 w-24 text-xs"
            />
          </div>
        )}

        {rangeLimits?.remaining && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder={t("remaining")}
              value={val("remaining_from", "")}
              onChange={(e) => setFilter("remaining_from", e.target.value)}
              className="h-8 w-24 text-xs"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="max"
              value={val("remaining_to", "")}
              onChange={(e) => setFilter("remaining_to", e.target.value)}
              className="h-8 w-24 text-xs"
            />
          </div>
        )}

        <div className="relative" ref={dateRef}>
          <button
            type="button"
            onClick={() => setDateOpen((p) => !p)}
            className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              dateActive
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-input bg-background text-foreground hover:bg-muted/50"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            {t("lastContactDate")}
          </button>

          {dateOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30" onClick={() => setDateOpen(false)} />
              <div className="relative z-10 w-[380px] rounded-xl border bg-popover p-6 shadow-2xl">
                <p className="mb-4 text-sm font-semibold text-foreground">{t("lastContactDate")}</p>
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("lastContactFrom")}</label>
                    <Input
                      type="date"
                      value={val("last_contact_from", "")}
                      onChange={(e) => setFilter("last_contact_from", e.target.value)}
                      className="h-9 w-full text-xs"
                    />
                  </div>
                  <span className="mt-5 text-xs text-muted-foreground">-</span>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("lastContactTo")}</label>
                    <Input
                      type="date"
                      value={val("last_contact_to", "")}
                      onChange={(e) => setFilter("last_contact_to", e.target.value)}
                      className="h-9 w-full text-xs"
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setFilter("last_contact_from", "");
                      setFilter("last_contact_to", "");
                    }}
                  >
                    {t("filterAll")}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setDateOpen(false)}
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {customColumns
          .filter((c) => c.enabled && c.type === "select")
          .map((col) => (
            <select
              key={col.key}
              value={val(col.key)}
              onChange={(e) => setFilter(col.key, e.target.value)}
              className={selectClass}
            >
              <option value="all">{col.label_en}</option>
              {(col.options ?? []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ))}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 gap-1 text-xs">
            <X className="h-3 w-3" />
            {t("filterAll")}
          </Button>
        )}
      </div>
    </div>
  );
}
