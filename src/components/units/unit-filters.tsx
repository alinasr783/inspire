"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { ColumnConfig } from "@/lib/unit-config-actions";

interface UnitFiltersProps {
  customColumns: ColumnConfig[];
  compoundNames?: string[];
  rangeLimits?: {
    cash_required: { min: number; max: number } | null;
    remaining: { min: number; max: number } | null;
    area: { min: number; max: number } | null;
    building_number: { min: string; max: string } | null;
  };
}

const finishingOptions = ["راو", "نصف تشطيب", "تشطيب كامل", "تحت الإنشاء"];
const rentSaleOptions = ["إيجار", "بيع"];
const unitTypeOptions = ["شقة", "فيلا", "دوبلكس", "مكتب", "أرض", "تجاري"];

const selectClass = "flex h-8 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs font-medium text-foreground [&>option]:text-foreground [&>option]:bg-background";

function RangeFilterModal({
  label,
  min,
  max,
  prefix,
  open,
  onClose,
  exactKey,
}: {
  label: string;
  min: number;
  max: number;
  prefix: string;
  open: boolean;
  onClose: () => void;
  exactKey?: string;
}) {
  const t = useTranslations("Properties");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const fromKey = `${prefix}_from`;
  const toKey = `${prefix}_to`;

  const currentFrom = searchParams.get(fromKey);
  const currentTo = searchParams.get(toKey);
  const currentExact = exactKey ? searchParams.get(exactKey) : null;

  const [localMin, setLocalMin] = useState(
    currentFrom ? Number(currentFrom) : min
  );
  const [localMax, setLocalMax] = useState(
    currentTo ? Number(currentTo) : max
  );
  const [exactVal, setExactVal] = useState(currentExact ?? "");

  useEffect(() => {
    if (open) {
      setLocalMin(currentFrom ? Number(currentFrom) : min);
      setLocalMax(currentTo ? Number(currentTo) : max);
      setExactVal(currentExact ?? "");
    }
  }, [open, currentFrom, currentTo, currentExact, min, max]);

  const overlayRef = useRef<HTMLDivElement>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const barLeft = pct(localMin);
  const barRight = pct(localMax);

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (exactVal && exactKey) {
      params.set(exactKey, exactVal);
      params.delete(fromKey);
      params.delete(toKey);
    } else {
      if (exactKey) params.delete(exactKey);
      if (localMin > min) {
        params.set(fromKey, String(localMin));
      } else {
        params.delete(fromKey);
      }
      if (localMax < max) {
        params.set(toKey, String(localMax));
      } else {
        params.delete(toKey);
      }
    }
    const qs = params.toString();
    window.location.href = qs ? `${pathname}?${qs}` : pathname;
    onClose();
  };

  const clear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(fromKey);
    params.delete(toKey);
    if (exactKey) params.delete(exactKey);
    const qs = params.toString();
    window.location.href = qs ? `${pathname}?${qs}` : pathname;
    onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-80 rounded-xl border bg-card p-5 shadow-lg">
        <h3 className="mb-1 text-sm font-semibold">{label}</h3>

        {exactKey && (
          <div className="mb-4">
            <input
              type="number"
              value={exactVal}
              onChange={(e) => setExactVal(e.target.value)}
              placeholder={t("exactPlaceholder")}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}

        {!exactVal && (
          <>
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{min.toLocaleString()}</span>
              <span>{max.toLocaleString()}</span>
            </div>

            <div className="relative mb-6 h-2 rounded-full bg-muted">
              <div
                className="absolute h-full rounded-full bg-primary"
                style={{ left: `${barLeft}%`, right: `${100 - barRight}%` }}
              />
              <input
                type="range"
                min={min}
                max={max}
                value={localMin}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLocalMin(Math.min(v, localMax));
                }}
                className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow"
              />
              <input
                type="range"
                min={min}
                max={max}
                value={localMax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLocalMax(Math.max(v, localMin));
                }}
                className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow"
              />
            </div>

            <div className="mb-4 text-center text-sm font-medium">
              <span dir="ltr">{localMin.toLocaleString()}</span>
              <span className="mx-2 text-muted-foreground">:</span>
              <span dir="ltr">{localMax.toLocaleString()}</span>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={apply}>
            Apply
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={clear}>
            Clear
          </Button>
          <Button size="sm" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function RangeFilter({
  label,
  min,
  max,
  prefix,
  exactKey,
}: {
  label: string;
  min: number | null;
  max: number | null;
  prefix: string;
  exactKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  if (min == null || max == null) return null;

  const fromKey = `${prefix}_from`;
  const toKey = `${prefix}_to`;
  const fromVal = searchParams.get(fromKey);
  const toVal = searchParams.get(toKey);
  const exactVal = exactKey ? searchParams.get(exactKey) : null;

  const hasFilter = fromVal || toVal || exactVal;
  const buttonText = exactVal
    ? `= ${exactVal}`
    : hasFilter
      ? `${fromVal || min} : ${toVal || max}`
      : label;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
          hasFilter
            ? "border-primary bg-primary/10 text-primary"
            : "border-input bg-transparent text-foreground hover:bg-accent"
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="max-w-28 truncate">{buttonText}</span>
      </button>

      <RangeFilterModal
        label={label}
        min={min}
        max={max}
        prefix={prefix}
        open={open}
        onClose={() => setOpen(false)}
        exactKey={exactKey}
      />
    </>
  );
}

export function UnitFilters({ customColumns, compoundNames, rangeLimits }: UnitFiltersProps) {
  const t = useTranslations("Properties");
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const getParam = (key: string, def = "") => searchParams.get(key) ?? def;

  const navigate = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      const qs = params.toString();
      window.location.href = qs ? `${pathname}?${qs}` : pathname;
    },
    [searchParams, pathname]
  );

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    navigate({ q: (fd.get("q") as string) || null });
  };

  const clearAll = () => {
    window.location.href = pathname;
  };

  const hasActiveFilters =
    Array.from(searchParams.entries()).some(
      ([k, v]) => k !== "locale" && v && v !== "all"
    ) || !!getParam("q");

  const selectCustom = customColumns.filter((c) => c.enabled && c.type === "select");
  const textCustom = customColumns.filter((c) => c.enabled && c.type === "text");
  const numCustom = customColumns.filter((c) => c.enabled && c.type === "number");
  const dateCustom = customColumns.filter((c) => c.enabled && c.type === "date");

  return (
    <div className="mb-4 space-y-3">
      <form onSubmit={handleSearch} className="relative flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          defaultValue={getParam("q")}
          placeholder={t("filterSearch")}
          className="ps-9"
        />
      </form>

      <div className="flex flex-wrap gap-2">
        <select
          value={getParam("finishing_status", "all")}
          onChange={(e) => navigate({ finishing_status: e.target.value })}
          className={selectClass}
        >
          <option value="all">{t("finishingStatus")}</option>
          {finishingOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <select
          value={getParam("rent_sale", "all")}
          onChange={(e) => navigate({ rent_sale: e.target.value })}
          className={selectClass}
        >
          <option value="all">{t("rentSale")}</option>
          {rentSaleOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <select
          value={getParam("unit_type", "all")}
          onChange={(e) => navigate({ unit_type: e.target.value })}
          className={selectClass}
        >
          <option value="all">{t("unitType")}</option>
          {unitTypeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        {selectCustom.map((col) => (
          <select
            key={col.key}
            value={getParam(col.key, "all")}
            onChange={(e) => navigate({ [col.key]: e.target.value })}
            className={selectClass}
          >
            <option value="all">{col.label_en}</option>
            {(col.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ))}

        <select
          value={getParam("compound_name", "all")}
          onChange={(e) => navigate({ compound_name: e.target.value })}
          className={selectClass}
        >
          <option value="all">{t("compoundName")}</option>
          {(compoundNames ?? []).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <RangeFilter
          label={t("cashRequired")}
          min={rangeLimits?.cash_required?.min ?? null}
          max={rangeLimits?.cash_required?.max ?? null}
          prefix="cash"
        />

        <RangeFilter
          label={t("remaining")}
          min={rangeLimits?.remaining?.min ?? null}
          max={rangeLimits?.remaining?.max ?? null}
          prefix="remaining"
        />

        <RangeFilter
          label={t("area")}
          min={rangeLimits?.area?.min ?? null}
          max={rangeLimits?.area?.max ?? null}
          prefix="area"
          exactKey="area_eq"
        />

        {textCustom.map((col) => (
          <form
            key={col.key}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              navigate({ [col.key]: (fd.get(col.key) as string) || null });
            }}
          >
            <Input
              name={col.key}
              type="text"
              defaultValue={getParam(col.key)}
              placeholder={col.label_en}
              className="h-8 w-40 text-xs"
            />
          </form>
        ))}

        {numCustom.map((col) => (
          <form
            key={col.key}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              navigate({ [col.key]: (fd.get(col.key) as string) || null });
            }}
          >
            <Input
              name={col.key}
              type="number"
              defaultValue={getParam(col.key)}
              placeholder={col.label_en}
              className="h-8 w-32 text-xs"
            />
          </form>
        ))}

        {dateCustom.map((col) => (
          <form
            key={col.key}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              navigate({ [col.key]: (fd.get(col.key) as string) || null });
            }}
          >
            <Input
              name={col.key}
              type="date"
              defaultValue={getParam(col.key)}
              className="h-8 w-40 text-xs"
            />
          </form>
        ))}

        {hasActiveFilters && (
          <Button variant="ghost" size="xs" onClick={clearAll} className="h-8 gap-1 text-xs">
            <X className="h-3 w-3" />
            {t("filterAll")}
          </Button>
        )}
      </div>
    </div>
  );
}
