"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, FileSpreadsheet } from "lucide-react";
import type { PreviewRow } from "@/lib/unconfirmed-data-actions";

interface PreviewColumn {
  key: string;
  label: string;
  type: string;
}

interface DataPreviewTableProps {
  columns: PreviewColumn[];
  rows: PreviewRow[];
  locale: string;
  selectedIndices?: number[];
  onToggleSelect?: (index: number) => void;
  standardKeys?: string[];
}

export function DataPreviewTable({ columns, rows, locale, selectedIndices, onToggleSelect, standardKeys }: DataPreviewTableProps) {
  const t = useTranslations("UnconfirmedData");
  const warningsCount = rows.filter((r) => r.ai_notes).length;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );
  };

  const renderCellValue = (col: PreviewColumn, row: PreviewRow) => {
    if (col.key === "last_contact_date") {
      return formatDate(row.mapped[col.key] || null);
    }
    if (col.key === "owner_phone" || col.key === "owner_phone_alt") {
      const original = row.mapped[col.key] || "";
      const normalized = col.key === "owner_phone" ? row.phone_normalized : row.phone_alt_normalized;
      if (normalized && normalized !== original) {
        return (
          <span dir="ltr" className="text-xs">
            <span className="text-muted-foreground line-through">{original}</span>
            <span className="ml-1 text-green-600 dark:text-green-400">{normalized}</span>
          </span>
        );
      }
      return <span dir="ltr" className="text-xs">{original}</span>;
    }
    if (col.key === "phone") {
      const original = row.mapped[col.key] || "";
      const normalized = row.phone_normalized;
      if (normalized && normalized !== original) {
        return (
          <span dir="ltr" className="text-xs">
            <span className="text-muted-foreground line-through">{original}</span>
            <span className="ml-1 text-green-600 dark:text-green-400">{normalized}</span>
          </span>
        );
      }
      return <span dir="ltr" className="text-xs">{original}</span>;
    }
    if (col.key === "ai_notes") {
      return null;
    }
    const stdKeys = standardKeys ?? ["owner_name", "unit_area", "building_number", "unit_number", "owner_phone", "owner_phone_alt", "affiliated_company", "last_feedback", "last_contact_date"];
    if (stdKeys.includes(col.key)) {
      return row.mapped[col.key] || "";
    }
    const extraVal = row.extra_data[col.key];
    return extraVal != null ? String(extraVal) : "";
  };

  if (rows.length === 0) {
    return (
      <div className="px-3 py-12 text-center text-muted-foreground">
        <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 opacity-50" />
        {t("noData")}
      </div>
    );
  }

  return (
    <div>
      {warningsCount > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {warningsCount} {t("warnings")}
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground">
              {onToggleSelect && (
                <th className="w-10 px-2 py-2">
                  <input
                    type="checkbox"
                    checked={!!selectedIndices && selectedIndices.length === rows.length}
                    readOnly
                    className="h-4 w-4"
                  />
                </th>
              )}
              <th className="px-3 py-2 text-start font-medium whitespace-nowrap">#</th>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-start font-medium whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              {rows.some((r) => r.ai_notes) && (
                <th className="px-3 py-2 text-start font-medium whitespace-nowrap">{t("aiNotes")}</th>
              )}
            </tr>
          </thead>
          <tbody>
              {rows.map((row, idx) => {
              const isSelected = selectedIndices?.includes(idx);
              return (
                <tr
                  key={idx}
                  onClick={() => onToggleSelect?.(idx)}
                  className={`border-b last:border-0 ${
                    onToggleSelect ? "cursor-pointer" : ""
                  } hover:bg-muted/50 ${
                    isSelected ? "bg-primary/5" : ""
                  } ${row.ai_notes ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
                >
                  {onToggleSelect && (
                    <td className="w-10 px-2 py-2" onClick={(e) => { e.stopPropagation(); onToggleSelect(idx); }}>
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        readOnly
                        className="h-4 w-4 pointer-events-none"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                  {columns.map((col) => (
                    <td key={col.key} className="max-w-40 truncate px-3 py-2 text-xs">
                      {renderCellValue(col, row)}
                    </td>
                  ))}
                  {rows.some((r) => r.ai_notes) && (
                    <td className="px-3 py-2">
                      {row.ai_notes && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {row.ai_notes}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
