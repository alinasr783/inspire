"use client";

import { useState, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Building2 } from "lucide-react";
import { updateColumnOrder, renameColumnConfig, type ColumnConfig } from "@/lib/unit-config-actions";
import type { UnitRow } from "@/lib/unit-actions";

interface UnitTableProps {
  columns: ColumnConfig[];
  units: UnitRow[];
  locale: string;
}

export function UnitTable({ columns, units, locale }: UnitTableProps) {
  const t = useTranslations("Properties");
  const router = useRouter();
  const enabledColumns = columns.filter((c) => c.enabled);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [localCols, setLocalCols] = useState(enabledColumns);
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  // Sync when columns prop changes
  useState(() => { setLocalCols(enabledColumns); });

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...localCols];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setLocalCols(reordered);
    setDragIdx(idx);
  };

  const handleDrop = async () => {
    setDragIdx(null);
    const updated = localCols.map((col, i) => ({ id: col.id, sort_order: i }));
    await updateColumnOrder(updated);
    router.refresh();
  };

  const handleDoubleClick = (col: ColumnConfig) => {
    setEditingCol(col.id);
    setEditValue(locale === "ar" ? col.label_ar : col.label_en);
    setTimeout(() => editRef.current?.select(), 50);
  };

  const handleRename = async (col: ColumnConfig) => {
    if (!editValue.trim()) return;
    const labelAr = locale === "ar" ? editValue.trim() : col.label_ar;
    const labelEn = locale === "en" ? editValue.trim() : col.label_en;
    await renameColumnConfig(col.id, labelAr, labelEn);
    setEditingCol(null);
    router.refresh();
  };

  const getLabel = (col: ColumnConfig) => {
    if (editingCol === col.id) {
      return (
        <input
          ref={editRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleRename(col)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename(col);
            if (e.key === "Escape") setEditingCol(null);
          }}
          className="w-full bg-transparent border-b border-primary px-0 py-0 text-xs font-medium outline-none"
          autoFocus
        />
      );
    }
    return locale === "ar" ? col.label_ar : col.label_en;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );
  };

  const formatNumber = (val: unknown) => {
    if (val == null || val === "") return "";
    const n = Number(val);
    return isNaN(n) ? String(val) : n.toLocaleString();
  };

  const renderCell = (col: ColumnConfig, unit: UnitRow) => {
    const raw = col.is_builtin
      ? String((unit as Record<string, unknown>)[col.key] ?? "")
      : String((unit.custom_fields as Record<string, unknown>)?.[col.key] ?? "");

    if (!raw) return "";

    if (col.key === "finishing_status") {
      return (
        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
          {raw}
        </span>
      );
    }
    if (col.key === "rent_sale") {
      return (
        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
          {raw}
        </span>
      );
    }
    if (col.key === "cash_required" || col.key === "remaining") {
      return <span dir="ltr">{formatNumber(raw)}</span>;
    }
    if (col.key === "last_contact_date") {
      return formatDate(raw);
    }
    return raw;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            {localCols.map((col, idx) => (
              <th
                key={col.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={handleDrop}
                onDoubleClick={() => handleDoubleClick(col)}
                className={`px-3 py-2 text-start font-medium whitespace-nowrap select-none ${dragIdx === idx ? "opacity-50" : ""}`}
              >
                {getLabel(col)}
              </th>
            ))}
            <th className="px-3 py-2 text-start font-medium whitespace-nowrap">
              {t("actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {units.length === 0 ? (
            <tr>
              <td colSpan={localCols.length + 1} className="px-3 py-12 text-center text-muted-foreground">
                <Building2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
                {t("empty")}
              </td>
            </tr>
          ) : (
            units.map((unit) => (
              <tr key={unit.id} className="border-b last:border-0 hover:bg-muted/50">
                {localCols.map((col) => (
                  <td key={col.id} className="px-3 py-2 max-w-48 truncate">
                    {renderCell(col, unit)}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <Link href={`/properties/${unit.id}`}>
                    <Button variant="outline" size="sm">
                      {t("propertyDetails")}
                    </Button>
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
