"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Search, X, Calendar, AlertTriangle, Filter } from "lucide-react";
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
  availableOptions?: Record<string, string[]>;
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
  availableOptions,
}: UnitFiltersProps) {
  const t = useTranslations("Properties");
  const [moreOpen, setMoreOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const val = (key: string, fallback = "all") => filters[key] ?? fallback;

  const getOptions = (key: string, fallbackOptions: string[]) => {
    if (availableOptions?.[key] && availableOptions[key].length > 0) {
      return availableOptions[key].filter((opt) => fallbackOptions.includes(opt));
    }
    return fallbackOptions;
  };

  const dateActive = !!(filters.last_contact_from || filters.last_contact_to);

  const renderSelect = (key: string, label: string, options: string[]) => (
    <select
      value={val(key)}
      onChange={(e) => setFilter(key, e.target.value)}
      className={selectClass}
    >
      <option value="all">{label}</option>
      {getOptions(key, options).map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );

  const moreSections = (
    <div className="space-y-4">
      {renderSelect("finishing_status", t("finishingStatus"), uniqueFinishing)}
      {renderSelect("rent_sale", t("rentSale"), uniqueRentSale)}
      {renderSelect("area", t("area"), uniqueAreas)}
      {employeeOptions && employeeOptions.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("assignedEmployee")}</label>
          <select
            value={val("assigned_employee")}
            onChange={(e) => setFilter("assigned_employee", e.target.value)}
            className={`${selectClass} w-full`}
          >
            <option value="all">{t("filterAll")}</option>
            {(availableOptions?.["assigned_employee"]
              ? employeeOptions.filter((e) => availableOptions["assigned_employee"]!.includes(e.id))
              : employeeOptions
            ).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      )}

      {rangeLimits?.cash_required && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("cashRequired")}</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder={t("cashRequired")}
              value={val("cash_from", "")}
              onChange={(e) => setFilter("cash_from", e.target.value)}
              className="h-9 flex-1 text-xs"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={val("cash_to", "")}
              onChange={(e) => setFilter("cash_to", e.target.value)}
              className="h-9 flex-1 text-xs"
            />
          </div>
        </div>
      )}

      {rangeLimits?.remaining && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("remaining")}</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder={t("remaining")}
              value={val("remaining_from", "")}
              onChange={(e) => setFilter("remaining_from", e.target.value)}
              className="h-9 flex-1 text-xs"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={val("remaining_to", "")}
              onChange={(e) => setFilter("remaining_to", e.target.value)}
              className="h-9 flex-1 text-xs"
            />
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("lastContactDate")}</label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-muted-foreground">{t("lastContactFrom")}</label>
            <Input
              type="date"
              value={val("last_contact_from", "")}
              onChange={(e) => setFilter("last_contact_from", e.target.value)}
              className="h-9 w-full text-xs"
            />
          </div>
          <span className="mt-4 text-xs text-muted-foreground">-</span>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-muted-foreground">{t("lastContactTo")}</label>
            <Input
              type="date"
              value={val("last_contact_to", "")}
              onChange={(e) => setFilter("last_contact_to", e.target.value)}
              className="h-9 w-full text-xs"
            />
          </div>
        </div>
      </div>

      {customColumns
        .filter((c) => c.enabled && c.type === "select")
        .map((col) => (
          <div key={col.key}>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{col.label_en}</label>
            <select
              value={val(col.key)}
              onChange={(e) => setFilter(col.key, e.target.value)}
              className={`${selectClass} w-full`}
            >
              <option value="all">{t("filterAll")}</option>
              {getOptions(col.key, col.options ?? []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="w-full gap-1 text-xs">
          <X className="h-3 w-3" />
          {t("filterAll")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={val("q", "")}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder={t("filterSearchProps")}
            className="ps-9"
          />
        </div>
        <Button
          variant={val("duplicate_phone") === "1" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("duplicate_phone", val("duplicate_phone") === "1" ? "all" : "1")}
          className="gap-1.5 shrink-0"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {t("duplicatePhone")}
        </Button>
      </div>

      {/* Desktop: all filters inline */}
      <div className="relative hidden flex-wrap items-center gap-2 sm:flex">
        {renderSelect("finishing_status", t("finishingStatus"), uniqueFinishing)}
        {renderSelect("rent_sale", t("rentSale"), uniqueRentSale)}
        {renderSelect("unit_type", t("unitType"), uniqueUnitType)}
        {renderSelect("compound_name", t("compoundName"), uniqueCompounds)}
        {renderSelect("area", t("area"), uniqueAreas)}

        {employeeOptions && employeeOptions.length > 0 && (
          <select
            value={val("assigned_employee")}
            onChange={(e) => setFilter("assigned_employee", e.target.value)}
            className={selectClass}
          >
            <option value="all">{t("assignedEmployee")}</option>
            {(availableOptions?.["assigned_employee"]
              ? employeeOptions.filter((e) => availableOptions["assigned_employee"]!.includes(e.id))
              : employeeOptions
            ).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}

        {rangeLimits?.cash_required && (
          <div className="flex items-center gap-1">
            <Input type="number" placeholder={t("cashRequired")} value={val("cash_from", "")} onChange={(e) => setFilter("cash_from", e.target.value)} className="h-8 w-24 text-xs" />
            <span className="text-xs text-muted-foreground">-</span>
            <Input type="number" placeholder="max" value={val("cash_to", "")} onChange={(e) => setFilter("cash_to", e.target.value)} className="h-8 w-24 text-xs" />
          </div>
        )}

        {rangeLimits?.remaining && (
          <div className="flex items-center gap-1">
            <Input type="number" placeholder={t("remaining")} value={val("remaining_from", "")} onChange={(e) => setFilter("remaining_from", e.target.value)} className="h-8 w-24 text-xs" />
            <span className="text-xs text-muted-foreground">-</span>
            <Input type="number" placeholder="max" value={val("remaining_to", "")} onChange={(e) => setFilter("remaining_to", e.target.value)} className="h-8 w-24 text-xs" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setDateRangeOpen((p) => !p)}
          className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
            dateActive ? "border-primary/50 bg-primary/10 text-primary" : "border-input bg-background text-foreground hover:bg-muted/50"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          {t("lastContactDate")}
        </button>

        {dateRangeOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border bg-popover p-4 shadow-2xl sm:left-auto sm:right-0 sm:min-w-[380px]">
            <p className="mb-3 text-sm font-semibold text-foreground">{t("lastContactDate")}</p>
            <div className="flex items-center gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("lastContactFrom")}</label>
                <Input type="date" value={val("last_contact_from", "")} onChange={(e) => setFilter("last_contact_from", e.target.value)} className="h-9 w-full text-xs" />
              </div>
              <span className="mt-5 text-xs text-muted-foreground">-</span>
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("lastContactTo")}</label>
                <Input type="date" value={val("last_contact_to", "")} onChange={(e) => setFilter("last_contact_to", e.target.value)} className="h-9 w-full text-xs" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilter("last_contact_from", ""); setFilter("last_contact_to", ""); }}>
                {t("filterAll")}
              </Button>
              <Button variant="default" size="sm" className="h-8 text-xs" onClick={() => setDateRangeOpen(false)}>OK</Button>
            </div>
          </div>
        )}

        {customColumns
          .filter((c) => c.enabled && c.type === "select")
          .map((col) => (
            <select key={col.key} value={val(col.key)} onChange={(e) => setFilter(col.key, e.target.value)} className={selectClass}>
              <option value="all">{col.label_en}</option>
              {getOptions(col.key, col.options ?? []).map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
            </select>
          ))}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 gap-1 text-xs">
            <X className="h-3 w-3" />
            {t("filterAll")}
          </Button>
        )}
      </div>

      {/* Mobile: compound + unit_type + Display More */}
      <div className="flex flex-wrap items-center gap-2 sm:hidden">
        {renderSelect("compound_name", t("compoundName"), uniqueCompounds)}
        {renderSelect("unit_type", t("unitType"), uniqueUnitType)}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setMoreOpen(true)}
        >
          <Filter className="h-3.5 w-3.5" />
          {t("displayMoreFilters") ?? "More Filters"}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 gap-1 text-xs">
            <X className="h-3 w-3" />
            {t("filterAll")}
          </Button>
        )}
      </div>

      {/* Mobile: More Filters */}
      <ResponsiveDialog
        open={moreOpen}
        onOpenChange={setMoreOpen}
        className="max-h-[80vh]"
        contentClassName="sm:max-w-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("displayMoreFilters") ?? "More Filters"}</h2>
          <button onClick={() => setMoreOpen(false)} className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        {moreSections}
      </ResponsiveDialog>
    </div>
  );
}
