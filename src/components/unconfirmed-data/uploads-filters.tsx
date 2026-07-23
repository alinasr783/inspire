"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export function UploadsFilters() {
  const t = useTranslations("UnconfirmedData");
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
