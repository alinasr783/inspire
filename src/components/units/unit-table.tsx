"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Building2, Trash2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { updateColumnOrder, renameColumnConfig, type ColumnConfig } from "@/lib/unit-config-actions";
import { updateUnitField, quickCreateUnit } from "@/lib/unit-actions";
import { deleteUnit } from "@/lib/unit-actions";
import { useRealtime } from "@/components/providers/realtime-provider";
import { PresenceTd } from "@/components/realtime/presence-td";
import { useTableCellKeyboard } from "@/hooks/use-table-cell-keyboard";
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
  assigned_employee: 150,
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
  employeeMap: Map<string, string>;
  uniqueValues: { finishing_status: string[]; rent_sale: string[]; unit_type: string[] };
}

/* -- Cell Editor -- */
const CellEditor = memo(
  ({ defaultValue, type, options, colKey, onSave, onCancel }: { defaultValue: string; type: string; options?: { value: string; label: string }[]; colKey?: string; onSave: (v: string) => void; onCancel: () => void }) => {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { const el = ref.current; if (el) { el.focus(); el.select(); } }, []);

    const needsSelect = options?.some((o) => o.value !== o.label);

    if (options !== undefined && needsSelect) {
      return (
        <select defaultValue={defaultValue} onBlur={(e) => onSave(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
          className="block h-full w-full border-none bg-transparent px-2 py-2 text-xs outline-none cursor-pointer" autoFocus>
          <option value="">—</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }

    if (options !== undefined) {
      const listId = `datalist-${colKey || "editor"}`;
      const commit = useCallback(() => onSave(ref.current?.value ?? ""), [onSave]);
      const keyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") onCancel(); }, [commit, onCancel]);
      return (
        <>
          <input ref={ref} list={listId} type="text" defaultValue={defaultValue} onBlur={commit} onKeyDown={keyDown}
            className="block h-full w-full border-none bg-transparent px-3 py-2 text-xs outline-none" />
          <datalist id={listId}>
            {options.map((o) => <option key={o.value} value={o.label} />)}
          </datalist>
        </>
      );
    }

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
  onEditCancel: () => void; isAdmin: boolean; onDelete: (uid: string) => void;
  userId: string;
  employeeMap: Map<string, string>;
  uniqueValues: { finishing_status: string[]; rent_sale: string[]; unit_type: string[] };
}

const Row = function Row({ unit, columns, locale, editingField, onCellEdit, onCellSave, onEditCancel, isAdmin, onDelete, userId, employeeMap, uniqueValues }: RowProps) {
    const t = useTranslations("Properties");
    const uid = unit.id;
    return (
      <tr className="hover:bg-muted/30">
        {columns.map((col) => {
          const key = col.key;
          const isEdit = editingField === key;
          const isOwner = (unit as any).created_by === userId || (unit as any).assigned_employee === userId;
          const canEdit = isAdmin || isOwner || key === "feedback";
          const rawVal = col.is_builtin ? String((unit as Record<string, unknown>)[key] ?? "") : String((unit.custom_fields as Record<string, unknown>)?.[key] ?? "");
          const raw = key === "assigned_employee" ? (employeeMap.get(rawVal) || rawVal) : rawVal;
          const editDefault = key === "assigned_employee" ? rawVal : raw;
          const editOptions =
            key === "assigned_employee" ? Array.from(employeeMap.entries()).map(([id, name]) => ({ value: id, label: name })) :
            key === "finishing_status" ? (uniqueValues.finishing_status || []).map((v) => ({ value: v, label: v })) :
            key === "rent_sale" ? (uniqueValues.rent_sale || []).map((v) => ({ value: v, label: v })) :
            key === "unit_type" ? (uniqueValues.unit_type || []).map((v) => ({ value: v, label: v })) :
            undefined;
          const editType = key === "assigned_employee" || key === "finishing_status" || key === "rent_sale" || key === "unit_type" ? "select" : (key === "cash_required" || key === "remaining" ? "number" : key === "last_contact_date" ? "date" : "text");
          return (
            <PresenceTd key={col.id} table="properties" rowId={unit.id} colKey={col.key} className="overflow-hidden border-b border-r align-middle">
              {isEdit ? (
                <CellEditor defaultValue={editDefault} type={editType} options={editOptions} colKey={key} onSave={(v) => onCellSave(uid, key, v)} onCancel={onEditCancel} />
              ) : (
                <CellDisplay col={col} raw={raw} locale={locale} onEdit={() => onCellEdit(uid, key)} canEdit={canEdit} />
              )}
            </PresenceTd>
          );
        })}
        <td className="whitespace-nowrap border-b px-3 py-2 align-middle">
          <div className="flex items-center gap-1">
            <Link href={`/properties/${unit.id}`}><Button variant="outline" size="sm">{t("propertyDetails")}</Button></Link>
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onDelete(uid)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  }

export function UnitTable({ columns, units: serverUnits, locale, isAdmin, userId, employeeMap, uniqueValues }: UnitTableProps) {
  const t = useTranslations("Properties");
  const router = useRouter();
  const { notifyCellEdit } = useRealtime();
  const [localUnits, setLocalUnits] = useState(serverUnits);
  const { containerRef, ctrlD } = useTableCellKeyboard(localUnits);
  const enabledColumns = useMemo(() => columns.filter((c) => c.enabled), [columns]);

  const srvRef = useRef(serverUnits); srvRef.current = serverUnits;
  const bgSaveRef = useRef<Set<string>>(new Set());

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [localCols, setLocalCols] = useState(enabledColumns);
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ uid: string; key: string } | null>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const col of enabledColumns) initial[col.key] = defaultColWidth(col.key);
    return initial;
  });
  const colWidthsRef = useRef(colWidths);
  colWidthsRef.current = colWidths;

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

  const unitsBuiltin = useRef(new Set([
    "customer_name","phone","compound_name","area","building_number",
    "finishing_status","rent_sale","unit_type","cash_required","remaining",
    "last_contact_date","additional_notes","feedback","assigned_employee",
  ]));

  /* -- Inline cell edit -- */
  const cellEdit = useCallback((uid: string, key: string) => setEditing({ uid, key }), []);
  const cellSave = useCallback((uid: string, key: string, value: string) => {
    setEditing(null);
    setLocalUnits((prev) => prev.map((u) => {
      if (u.id !== uid) return u;
      if (unitsBuiltin.current.has(key)) return { ...u, [key]: value } as UnitRow;
      const cf = { ...(u.custom_fields as Record<string, unknown>), [key]: value.trim() || null };
      return { ...u, custom_fields: cf } as UnitRow;
    }));
    notifyCellEdit({ table: "units", rowId: uid, field: key, action: "update" });
    const tag = uid + key;
    if (!bgSaveRef.current.has(tag)) { bgSaveRef.current.add(tag); updateUnitField(uid, key, value).finally(() => bgSaveRef.current.delete(tag)); }
  }, [notifyCellEdit]);
  const editCancel = useCallback(() => setEditing(null), []);

  const handleDelete = useCallback(async (uid: string) => {
    setLocalUnits((prev) => prev.filter((u) => u.id !== uid));
    try { await deleteUnit(uid); router.refresh(); } catch { setLocalUnits(srvRef.current); }
  }, [router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key === "d") {
        ctrlD(cellSave, (rowId, colKey) => {
          const idx = localUnits.findIndex((u) => u.id === rowId);
          if (idx <= 0) return null;
          const prev = localUnits[idx - 1] as Record<string, unknown>;
          const val = prev[colKey];
          return (val != null && val !== "") ? String(val) : null;
        });
      }
      if (e.ctrlKey && e.key === "i") {
        e.preventDefault();
        quickCreateUnit(userId).then((newUnit) => {
          setLocalUnits((prev) => [newUnit, ...prev]);
        }).catch(() => {});
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ctrlD, cellSave, localUnits]);

  const ed = editing;

  return (
    <TooltipProvider>
      <div ref={containerRef} className="overflow-x-auto rounded-lg border">
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
                  isAdmin={isAdmin} employeeMap={employeeMap} uniqueValues={uniqueValues} onDelete={handleDelete} userId={userId}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
