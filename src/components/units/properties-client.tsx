"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UnitFilters } from "@/components/units/unit-filters";
import { UnitTable } from "@/components/units/unit-table";
import type { ColumnConfig } from "@/lib/unit-config-actions";
import type { UnitRow } from "@/lib/unit-actions";

interface PropertiesClientProps {
  initialUnits: UnitRow[];
  columns: ColumnConfig[];
  locale: string;
  isAdmin: boolean;
  userId: string;
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

export function PropertiesClient({
  initialUnits,
  columns,
  locale,
  isAdmin,
  userId,
  customColumns,
  uniqueFinishing,
  uniqueRentSale,
  uniqueUnitType,
  uniqueCompounds,
  uniqueAreas,
  rangeLimits,
}: PropertiesClientProps) {
  const t = useTranslations("Properties");

  const [filters, setFilters] = useState<Record<string, string>>(() =>
    buildInitialFilters(customColumns)
  );
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
    let result = initialUnits;

    const searchTerm = filters.q?.toLowerCase();
    if (searchTerm) {
      result = result.filter((u) =>
        [u.customer_name, u.phone, u.compound_name, u.additional_notes, u.feedback].some(
          (v) => (v ?? "").toLowerCase().includes(searchTerm)
        )
      );
    }

    for (const key of BUILTIN_DROPDOWN_KEYS) {
      const val = filters[key];
      if (val && val !== "all") {
        result = result.filter((u) => u[key as keyof UnitRow] === val);
      }
    }

    if (filters.cash_from) {
      const min = Number(filters.cash_from);
      if (!isNaN(min)) result = result.filter((u) => (u.cash_required ?? 0) >= min);
    }
    if (filters.cash_to) {
      const max = Number(filters.cash_to);
      if (!isNaN(max)) result = result.filter((u) => (u.cash_required ?? 0) <= max);
    }
    if (filters.remaining_from) {
      const min = Number(filters.remaining_from);
      if (!isNaN(min)) result = result.filter((u) => (u.remaining ?? 0) >= min);
    }
    if (filters.remaining_to) {
      const max = Number(filters.remaining_to);
      if (!isNaN(max)) result = result.filter((u) => (u.remaining ?? 0) <= max);
    }

    if (filters.last_contact_from) {
      const from = toDateOnly(filters.last_contact_from);
      if (from) {
        result = result.filter((u) => {
          if (!u.last_contact_date) return false;
          return toDateOnly(u.last_contact_date) >= from;
        });
      }
    }
    if (filters.last_contact_to) {
      const to = toDateOnly(filters.last_contact_to);
      if (to) {
        result = result.filter((u) => {
          if (!u.last_contact_date) return false;
          return toDateOnly(u.last_contact_date) <= to;
        });
      }
    }

    for (const col of customColumns) {
      const val = filters[col.key];
      if (val && val !== "all") {
        const term = val.toLowerCase();
        result = result.filter((u) => {
          const cv = (u.custom_fields as Record<string, unknown>)?.[col.key];
          return cv ? String(cv).toLowerCase().includes(term) : false;
        });
      }
    }

    return result;
  }, [initialUnits, filters, customColumns]);

  const hasActiveFilters = useMemo(() => {
    if (filters.q) return true;
    for (const key of [...BUILTIN_DROPDOWN_KEYS, ...customColumns.map((c) => c.key)]) {
      if (filters[key] && filters[key] !== "all") return true;
    }
    if (filters.cash_from || filters.cash_to || filters.remaining_from || filters.remaining_to) return true;
    if (filters.last_contact_from || filters.last_contact_to) return true;
    return false;
  }, [filters, customColumns]);

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
        rangeLimits={rangeLimits}
      />

      <UnitTable
        columns={enabledCols}
        units={visibleUnits}
        locale={locale}
        isAdmin={isAdmin}
        userId={userId}
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
