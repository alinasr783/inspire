"use client";

import { useState, useMemo, useCallback, useEffect, useDeferredValue, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UnitFilters } from "@/components/units/unit-filters";
import { UnitTable } from "@/components/units/unit-table";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import type { ColumnConfig } from "@/lib/unit-config-actions";
import type { UnitRow } from "@/lib/unit-actions";

interface PropertiesClientProps {
  initialUnits: UnitRow[];
  columns: ColumnConfig[];
  locale: string;
  isAdmin: boolean;
  userId: string;
  employeeMap: Map<string, string>;
  employeeOptions: { id: string; name: string }[];
  customColumns: ColumnConfig[];
  uniqueFinishing: string[];
  uniqueRentSale: string[];
  uniqueUnitType: string[];
  uniqueCompounds: string[];
  uniqueAreas: string[];
  rangeLimits: {
    cash_required: { min: number; max: number } | null;
    remaining: { min: number; max: number } | null;
  };
}

const BUILTIN_DROPDOWN_KEYS = [
  "finishing_status",
  "rent_sale",
  "unit_type",
  "compound_name",
  "area",
];

function buildInitialFilters(customColumns: ColumnConfig[]): Record<string, string> {
  const f: Record<string, string> = {
    q: "",
    finishing_status: "all",
    rent_sale: "all",
    unit_type: "all",
    compound_name: "all",
    area: "all",
    cash_from: "",
    cash_to: "",
    remaining_from: "",
    remaining_to: "",
    assigned_employee: "all",
    last_contact_from: "",
    last_contact_to: "",
  };
  for (const col of customColumns) {
    f[col.key] = "all";
  }
  return f;
}

function toDateOnly(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function applyFilters(
  units: UnitRow[],
  filters: Record<string, string>,
  search: string,
  customColumns: ColumnConfig[],
  duplicatePhones: Set<string>,
  skipKey?: string,
): UnitRow[] {
  let result = units;

  if (search) {
    result = result.filter((u) =>
      [u.customer_name, u.phone, u.compound_name, u.additional_notes, u.feedback].some(
        (v) => (v ?? "").toLowerCase().includes(search)
      )
    );
  }

  for (const key of BUILTIN_DROPDOWN_KEYS) {
    if (key === skipKey) continue;
    const val = filters[key];
    if (val && val !== "all") {
      result = result.filter((u) => u[key as keyof UnitRow] === val);
    }
  }

  if (filters.cash_from && "cash_from" !== skipKey) {
    const min = Number(filters.cash_from);
    if (!isNaN(min)) result = result.filter((u) => (u.cash_required ?? 0) >= min);
  }
  if (filters.cash_to && "cash_to" !== skipKey) {
    const max = Number(filters.cash_to);
    if (!isNaN(max)) result = result.filter((u) => (u.cash_required ?? 0) <= max);
  }
  if (filters.remaining_from && "remaining_from" !== skipKey) {
    const min = Number(filters.remaining_from);
    if (!isNaN(min)) result = result.filter((u) => (u.remaining ?? 0) >= min);
  }
  if (filters.remaining_to && "remaining_to" !== skipKey) {
    const max = Number(filters.remaining_to);
    if (!isNaN(max)) result = result.filter((u) => (u.remaining ?? 0) <= max);
  }

  if (filters.assigned_employee && filters.assigned_employee !== "all" && "assigned_employee" !== skipKey) {
    result = result.filter((u) => (u as any).assigned_employee === filters.assigned_employee);
  }

  if (filters.last_contact_from && "last_contact_from" !== skipKey) {
    const from = toDateOnly(filters.last_contact_from);
    if (from) {
      result = result.filter((u) => {
        if (!u.last_contact_date) return false;
        return toDateOnly(u.last_contact_date) >= from;
      });
    }
  }
  if (filters.last_contact_to && "last_contact_to" !== skipKey) {
    const to = toDateOnly(filters.last_contact_to);
    if (to) {
      result = result.filter((u) => {
        if (!u.last_contact_date) return false;
        return toDateOnly(u.last_contact_date) <= to;
      });
    }
  }

  for (const col of customColumns) {
    if (col.key === skipKey) continue;
    const val = filters[col.key];
    if (val && val !== "all") {
      const term = val.toLowerCase();
      result = result.filter((u) => {
        const cv = (u.custom_fields as Record<string, unknown>)?.[col.key];
        return cv ? String(cv).toLowerCase().includes(term) : false;
      });
    }
  }

  if (filters.duplicate_phone === "1" && "duplicate_phone" !== skipKey) {
    result = result.filter((u) => u.phone && duplicatePhones.has(u.phone));
  }

  return result;
}

export function PropertiesClient({
  initialUnits,
  columns,
  locale,
  isAdmin,
  userId,
  employeeMap,
  employeeOptions,
  customColumns,
  uniqueFinishing,
  uniqueRentSale,
  uniqueUnitType,
  uniqueCompounds,
  uniqueAreas,
  rangeLimits,
}: PropertiesClientProps) {
  const t = useTranslations("Properties");

  const { data: liveUnits, setInitialData } = useRealtimeSync<UnitRow>("units");

  useEffect(() => {
    setInitialData(initialUnits);
  }, [initialUnits, setInitialData]);

  const unitsData = liveUnits.length > 0 ? liveUnits : initialUnits;

  const duplicatePhones = useMemo(() => {
    const count = new Map<string, number>();
    for (const u of unitsData) {
      if (u.phone) count.set(u.phone, (count.get(u.phone) || 0) + 1);
    }
    return new Set([...count].filter(([, c]) => c > 1).map(([p]) => p));
  }, [unitsData]);

  const STORAGE_KEY = "properties_filters";

  const [filters, setFilters] = useState<Record<string, string>>(() =>
    buildInitialFilters(customColumns)
  );

  const filtersInitialized = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFilters((prev) => {
          const base = buildInitialFilters(customColumns);
          return { ...base, ...parsed };
        });
      }
    } catch { /* ignore */ }
    filtersInitialized.current = true;
  }, []);

  useEffect(() => {
    if (filtersInitialized.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    }
  }, [filters]);
  const deferredSearch = useDeferredValue(filters.q ?? "");
  const [showCount, setShowCount] = useState(50);

  const enabledCols = useMemo(
    () => columns.filter((c) => c.enabled),
    [columns]
  );

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setShowCount(50);
  }, []);

  const clearAll = useCallback(() => {
    setFilters(buildInitialFilters(customColumns));
    setShowCount(50);
  }, [customColumns]);

  const filteredUnits = useMemo(() => {
    const result = applyFilters(unitsData, filters, deferredSearch, customColumns, duplicatePhones);

    return [...result];
  }, [unitsData, filters, customColumns, deferredSearch, duplicatePhones]);

  const hasActiveFilters = useMemo(() => {
    if (filters.q) return true;
    for (const key of [...BUILTIN_DROPDOWN_KEYS, "assigned_employee", ...customColumns.map((c) => c.key)]) {
      if (filters[key] && filters[key] !== "all") return true;
    }
    if (filters.duplicate_phone === "1") return true;
    if (filters.cash_from || filters.cash_to || filters.remaining_from || filters.remaining_to) return true;
    if (filters.last_contact_from || filters.last_contact_to) return true;
    return false;
  }, [filters, customColumns]);

  const availableFilterOptions = useMemo(() => {
    if (!hasActiveFilters) return undefined;

    const options: Record<string, string[]> = {};
    const allDropdownKeys = [...BUILTIN_DROPDOWN_KEYS, "assigned_employee", ...customColumns.filter((c) => c.type === "select").map((c) => c.key)];

    for (const key of allDropdownKeys) {
      const subset = applyFilters(unitsData, filters, deferredSearch, customColumns, duplicatePhones, key);
      const vals = subset
        .map((u) => {
          if (key === "assigned_employee") return (u as any).assigned_employee;
          if (BUILTIN_DROPDOWN_KEYS.includes(key)) return u[key as keyof UnitRow];
          return (u.custom_fields as Record<string, unknown>)?.[key];
        })
        .filter((v): v is string => !!v);
      const unique = [...new Set(vals)].sort();
      if (unique.length > 0) {
        options[key] = unique;
      }
    }

    return Object.keys(options).length > 0 ? options : undefined;
  }, [unitsData, filters, customColumns, deferredSearch, duplicatePhones, hasActiveFilters]);

  const visibleUnits = useMemo(
    () => filteredUnits.slice(0, showCount),
    [filteredUnits, showCount]
  );

  return (
    <>
      <UnitFilters
        filters={filters}
        setFilter={setFilter}
        clearAll={clearAll}
        hasActiveFilters={hasActiveFilters}
        customColumns={customColumns}
        uniqueFinishing={uniqueFinishing}
        uniqueRentSale={uniqueRentSale}
        uniqueUnitType={uniqueUnitType}
        uniqueCompounds={uniqueCompounds}
        uniqueAreas={uniqueAreas}
        employeeOptions={employeeOptions}
        rangeLimits={rangeLimits}
        availableOptions={availableFilterOptions}
      />

      <UnitTable
        columns={enabledCols}
        units={visibleUnits}
        locale={locale}
        isAdmin={isAdmin}
        userId={userId}
        employeeMap={employeeMap}
        uniqueValues={{ finishing_status: uniqueFinishing, rent_sale: uniqueRentSale, unit_type: uniqueUnitType }}
        duplicatePhones={duplicatePhones}
      />

      {showCount < filteredUnits.length && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => setShowCount((c) => c + 50)}>
            {t("showMore")} ({filteredUnits.length - showCount} {t("remaining")})
          </Button>
        </div>
      )}
    </>
  );
}
