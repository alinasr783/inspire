"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UnitTable } from "@/components/units/unit-table";
import type { ColumnConfig } from "@/lib/unit-config-actions";
import type { UnitRow } from "@/lib/unit-actions";

interface Props {
  columns: ColumnConfig[];
  units: UnitRow[];
  locale: string;
}

export function PaginatedUnitTable({ columns, units, locale }: Props) {
  const t = useTranslations("Properties");
  const [showCount, setShowCount] = useState(50);

  const visible = units.slice(0, showCount);

  return (
    <>
      <UnitTable columns={columns} units={visible} locale={locale} />
      {showCount < units.length && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => setShowCount((c) => c + 50)}>
            {t("showMore")} ({units.length - showCount} {t("remaining")})
          </Button>
        </div>
      )}
    </>
  );
}
