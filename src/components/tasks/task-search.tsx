"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function TaskSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("Tasks");

  return (
    <div className="relative w-full max-w-lg">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={t("searchPlaceholder")}
        className="ps-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
