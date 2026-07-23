"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { ColumnConfig } from "@/lib/client-config-actions";
import { DynamicSelect } from "./dynamic-select";

interface ClientFiltersProps {
  customColumns: ColumnConfig[];
  rangeLimits?: {
    budget: { min: number; max: number } | null;
  };
  isAdmin: boolean;
  employees?: { id: string; name: string }[];
  dynamicOptions?: {
    source: string[];
    unit_type: string[];
    payment_method: string[];
    preferred_area: string[];
    preferred_developer: string[];
    bedrooms: string[];
  };
}

const selectClass = "flex h-8 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs font-medium text-foreground [&>option]:text-foreground [&>option]:bg-background";

function RangeFilterModal({
  label,
  min,
  max,
  prefix,
  open,
  onClose,
}: {
  label: string;
  min: number;
  max: number;
  prefix: string;
  open: boolean;
  onClose: () => void;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const fromKey = `${prefix}_from`;
  const toKey = `${prefix}_to`;

  const currentFrom = searchParams.get(fromKey);
  const currentTo = searchParams.get(toKey);

  const [localMin, setLocalMin] = useState(
    currentFrom ? Number(currentFrom) : min
  );
  const [localMax, setLocalMax] = useState(
    currentTo ? Number(currentTo) : max
  );

  useEffect(() => {
    if (open) {
      setLocalMin(currentFrom ? Number(currentFrom) : min);
      setLocalMax(currentTo ? Number(currentTo) : max);
    }
  }, [open, currentFrom, currentTo, min, max]);

  const overlayRef = useRef<HTMLDivElement>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const barLeft = pct(localMin);
  const barRight = pct(localMax);

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
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
    const qs = params.toString();
    window.location.href = qs ? `${pathname}?${qs}` : pathname;
    onClose();
  };

  const clear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(fromKey);
    params.delete(toKey);
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
}: {
  label: string;
  min: number | null;
  max: number | null;
  prefix: string;
}) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  if (min == null || max == null) return null;

  const fromKey = `${prefix}_from`;
  const toKey = `${prefix}_to`;
  const fromVal = searchParams.get(fromKey);
  const toVal = searchParams.get(toKey);

  const hasFilter = fromVal || toVal;
  const buttonText = hasFilter
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
      />
    </>
  );
}

export function ClientFilters({
  customColumns,
  rangeLimits,
  isAdmin,
  employees,
  dynamicOptions,
}: ClientFiltersProps) {
  const t = useTranslations("Clients");
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
        {isAdmin && employees && employees.length > 0 && (
          <select
            value={getParam("created_by", "all")}
            onChange={(e) => navigate({ created_by: e.target.value })}
            className={selectClass}
          >
            <option value="all">{t("allEmployees")}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        )}

        {dynamicOptions?.payment_method && (
          <select
            value={getParam("payment_method", "all")}
            onChange={(e) => navigate({ payment_method: e.target.value })}
            className={selectClass}
          >
            <option value="all">{t("paymentMethod")}</option>
            {dynamicOptions.payment_method.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}

        {dynamicOptions?.unit_type && (
          <select
            value={getParam("unit_type", "all")}
            onChange={(e) => navigate({ unit_type: e.target.value })}
            className={selectClass}
          >
            <option value="all">{t("unitType")}</option>
            {dynamicOptions.unit_type.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}

        {dynamicOptions?.source && (
          <select
            value={getParam("source", "all")}
            onChange={(e) => navigate({ source: e.target.value })}
            className={selectClass}
          >
            <option value="all">{t("source")}</option>
            {dynamicOptions.source.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}

        <RangeFilter
          label={t("budget")}
          min={rangeLimits?.budget?.min ?? null}
          max={rangeLimits?.budget?.max ?? null}
          prefix="budget"
        />

        {selectCustom.map((col) => (
          <select
            key={col.key}
            value={getParam(col.key, "all")}
            onChange={(e) => navigate({ [col.key]: e.target.value })}
            className={selectClass}
          >
            <option value="all">{col.label_en}</option>
            {(col.options ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ))}

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
