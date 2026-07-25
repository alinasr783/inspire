"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Building2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { updateColumnOrder, renameColumnConfig, type ColumnConfig } from "@/lib/unit-config-actions";
import { updateUnitField } from "@/lib/unit-actions";
import { loadColumnWidths, saveColumnWidths } from "@/lib/column-widths-storage";
import type { UnitRow } from "@/lib/unit-actions";

const COLUMN_WIDTHS: Record<string, number> = {
  customer_name: 180,
  phone: 140,
  compound_name: 160,
  area: 100,
  building_number: 110,
  finishing_status: 150,
  rent_sale: 110,
  unit_type: 120,
  cash_required: 130,
  remaining: 130,
  last_contact_date: 130,
  additional_notes: 180,
  feedback: 220,
};
const DEFAULT_COL_WIDTH = 150;
const MIN_COL_WIDTH = 50;
const ACTIONS_COL_WIDTH = 130;

function defaultColWidth(key: string) {
  return COLUMN_WIDTHS[key] ?? DEFAULT_COL_WIDTH;
}

interface UnitTableProps {
  columns: ColumnConfig[];
  units: UnitRow[];
  locale: string;
  isAdmin: boolean;
  userId: string;
}

/* -- Cell Editor -- */
const CellEditor = memo(
  ({ defaultValue, type, onSave, onCancel }: { defaultValue: string; type: string; onSave: (v: string) => void; onCancel: () => void }) => {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { const el = ref.current; if (el) { el.focus(); el.select(); } }, []);
    const commit = useCallback(() => onSave(ref.current?.value ?? ""), [onSave]);
    const keyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") onCancel(); }, [commit, onCancel]);
    return <input ref={ref} type={type === "date" ? "date" : type === "number" ? "number" : "text"} defaultValue={defaultValue} onBlur={commit} onKeyDown={keyDown} className="block h-full w-full border-none bg-transparent px-3 py-2 text-xs outline-none" />;
  }
);
CellEditor.displayName = "CellEditor";

/* -- Cell Display -- */
const CellDisplay = memo(
  ({ col, raw, locale, onEdit, canEdit }: { col: ColumnConfig; raw: string; locale: string; onEdit: () => void; canEdit: boolean }) => {
    const editableSpan = canEdit ? "cursor-pointer hover:bg-muted/50 px-3 py-2 block truncate" : "px-3 py-2 block truncate";
    const clickHandler = canEdit ? onEdit : undefined;

    if (!raw) return <span onClick={clickHandler} className={editableSpan}>&nbsp;</span>;

    if (col.key === "finishing_status") {
      return <Tooltip><TooltipTrigger><span onClick={clickHandler} className={editableSpan}><span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">{raw}</span></span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>;
    }
    if (col.key === "rent_sale") {
      return <Tooltip><TooltipTrigger><span onClick={clickHandler} className={editableSpan}><span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">{raw}</span></span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>;
    }
    if (col.key === "cash_required" || col.key === "remaining") {
      const n = Number(raw);
      const display = isNaN(n) ? raw : n.toLocaleString();
      return <Tooltip><TooltipTrigger><span onClick={clickHandler} className={editableSpan} dir="ltr">{display}</span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>;
    }
    if (col.key === "last_contact_date") {
      let display = raw;
      const d = new Date(raw);
      if (!isNaN(d.getTime())) display = d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" });
      return <Tooltip><TooltipTrigger><span onClick={clickHandler} className={editableSpan}>{display}</span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>;
    }
    return <Tooltip><TooltipTrigger><span onClick={clickHandler} className={editableSpan}>{raw}</span></TooltipTrigger><TooltipContent side="bottom" align="start" className="max-w-sm whitespace-pre-wrap break-words">{raw}</TooltipContent></Tooltip>;
  }
);
CellDisplay.displayName = "CellDisplay";

/* -- Row -- */
interface RowProps {
  unit: UnitRow; columns: ColumnConfig[]; locale: string; editingField: string | null;
  onCellEdit: (uid: string, field: string) => void; onCellSave: (uid: string, field: string, value: string) => void;
  onEditCancel: () => void; isAdmin: boolean;
}

const Row = memo(
  ({ unit, columns, locale, editingField, onCellEdit, onCellSave, onEditCancel, isAdmin }: RowProps) => {
    const t = useTranslations("Properties");
    const uid = unit.id;
    return (
      <tr className="hover:bg-muted/30">
        {columns.map((col) => {
          const key = col.key;
          const isEdit = editingField === key;
          const canEdit = isAdmin || key === "feedback";
          const raw = col.is_builtin ? String((unit as Record<string, unknown>)[key] ?? "") : String((unit.custom_fields as Record<string, unknown>)?.[key] ?? "");
          return (
            <td key={col.id} className="overflow-hidden border-b border-r align-middle">
              {isEdit ? (
                <CellEditor defaultValue={key === "last_contact_date" ? String((unit as Record<string, unknown>)[key] ?? "") : raw} type={key === "cash_required" || key === "remaining" ? "number" : key === "last_contact_date" ? "date" : "text"} onSave={(v) => onCellSave(uid, key, v)} onCancel={onEditCancel} />
              ) : (
                <CellDisplay col={col} raw={raw} locale={locale} onEdit={() => onCellEdit(uid, key)} canEdit={canEdit} />
              )}
            </td>
          );
        })}
        <td className="whitespace-nowrap border-b px-3 py-2 align-middle">
          <Link href={`/properties/${unit.id}`}><Button variant="outline" size="sm">{t("propertyDetails")}</Button></Link>
        </td>
      </tr>
    );
  }
);
Row.displayName = "Row";

export function UnitTable({ columns, units: serverUnits, locale, isAdmin, userId }: UnitTableProps) {
  const t = useTranslations("Properties");
  const router = useRouter();
  const enabledColumns = useMemo(() => columns.filter((c) => c.enabled), [columns]);

  const [localUnits, setLocalUnits] = useState(serverUnits);
  const srvRef = useRef(serverUnits); srvRef.current = serverUnits;
  const bgSaveRef = useRef<Set<string>>(new Set());

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [localCols, setLocalCols] = useState(enabledColumns);
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ uid: string; key: string } | null>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    for (const col of enabledColumns) defaults[col.key] = defaultColWidth(col.key);
    return loadColumnWidths("units", userId, defaults);
  });
  const colWidthsRef = useRef(colWidths);
  colWidthsRef.current = colWidths;

  useEffect(() => { saveColumnWidths("units", userId, colWidths); }, [colWidths, userId]);

  const dragStateRef = useRef<{ key: string; width: number } | null>(null);

  useEffect(() => { setLocalUnits(serverUnits); }, [serverUnits]);
  useEffect(() => { setLocalCols(enabledColumns); }, [enabledColumns]);
  useEffect(() => {
    setColWidths((prev) => {
      let changed = false;
      const updated = { ...prev };
      for (const col of enabledColumns) {
        if (!(col.key in prev)) { updated[col.key] = defaultColWidth(col.key); changed = true; }
      }
      return changed ? updated : prev;
    });
  }, [enabledColumns]);

  /* -- Column resize (direct DOM writes during drag, single setState on mouseUp) -- */
  const handleResizeMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidthsRef.current[colKey] ?? defaultColWidth(colKey);

    const move = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newW = Math.max(MIN_COL_WIDTH, startWidth + delta);
      dragStateRef.current = { key: colKey, width: newW };
      const el = document.querySelector(`col[data-col-key="${colKey}"]`) as HTMLElement | null;
      if (el) el.style.width = `${newW}px`;
    };

    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const final = dragStateRef.current;
      dragStateRef.current = null;
      if (final) setColWidths((prev) => ({ ...prev, [final.key]: final.width }));
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  /* -- Column reorder -- */
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

  /* -- Column rename -- */
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
      return <input ref={editRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleRename(col)} onKeyDown={(e) => { if (e.key === "Enter") handleRename(col); if (e.key === "Escape") setEditingCol(null); }} className="w-full border-b border-primary bg-transparent px-0 py-0 text-xs font-medium outline-none" autoFocus />;
    }
    return locale === "ar" ? col.label_ar : col.label_en;
  };

  /* -- Inline cell edit -- */
  const cellEdit = useCallback((uid: string, key: string) => setEditing({ uid, key }), []);
  const cellSave = useCallback((uid: string, key: string, value: string) => {
    setEditing(null);
    setLocalUnits((prev) => prev.map((u) => (u.id === uid ? ({ ...u, [key]: value } as UnitRow) : u)));
    const tag = uid + key;
    if (!bgSaveRef.current.has(tag)) { bgSaveRef.current.add(tag); updateUnitField(uid, key, value).finally(() => bgSaveRef.current.delete(tag)); }
  }, []);
  const editCancel = useCallback(() => setEditing(null), []);

  const ed = editing;

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-lg border">
        <table className="border-collapse text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            {localCols.map((col) => (
              <col key={col.id} data-col-key={col.key} style={{ width: colWidths[col.key] ?? defaultColWidth(col.key) }} />
            ))}
            <col style={{ width: ACTIONS_COL_WIDTH }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/40">
              {localCols.map((col, idx) => (
                <th key={col.id}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  onDoubleClick={() => handleDoubleClick(col)}
                  className={`relative select-none border-b border-r px-1.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap ${dragIdx === idx ? "opacity-50" : ""}`}
                >
                  <div
                    className="flex items-center gap-1 pr-3"
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                  >
                    <span className="flex-1">{getLabel(col)}</span>
                  </div>
                  <div
                    draggable={false}
                    className="absolute bottom-0 top-0 z-10 -right-px w-2 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors"
                    style={{ borderRight: "2px solid transparent" }}
                    onMouseDown={(e) => handleResizeMouseDown(e, col.key)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderRightColor = "var(--primary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderRightColor = "transparent"; }}
                  />
                </th>
              ))}
              <th className="border-b px-3 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {localUnits.length === 0 ? (
              <tr>
                <td colSpan={localCols.length + 1} className="px-3 py-12 text-center text-muted-foreground">
                  <Building2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  {t("empty")}
                </td>
              </tr>
            ) : (
              localUnits.map((unit) => (
                <Row key={unit.id} unit={unit} columns={localCols} locale={locale}
                  editingField={ed?.uid === unit.id ? ed.key : null}
                  onCellEdit={cellEdit} onCellSave={cellSave} onEditCancel={editCancel}
                  isAdmin={isAdmin}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
