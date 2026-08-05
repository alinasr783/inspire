"use client";

import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeFilter } from "@/lib/finance-types";

const FILTERS: { value: TimeFilter; labelKey: string }[] = [
  { value: "week", labelKey: "filterWeek" },
  { value: "month", labelKey: "filterMonth" },
  { value: "3months", labelKey: "filter3Months" },
  { value: "6months", labelKey: "filter6Months" },
  { value: "all", labelKey: "filterAll" },
];

export function TimeFilter({
  value,
  onChange,
}: {
  value: TimeFilter;
  onChange: (v: TimeFilter) => void;
}) {
  const t = useTranslations("Finances");

  return (
    <div className="flex items-center gap-2">
      <Clock className="size-4 text-muted-foreground" />
      <div className="flex rounded-lg border bg-card p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              value === f.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
