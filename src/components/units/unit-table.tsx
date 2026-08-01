"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Building2, Trash2, Eye, Pencil } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { updateColumnOrder, renameColumnConfig, type ColumnConfig } from "@/lib/unit-config-actions";
import { updateUnitField, quickCreateUnit, deleteUnit, type UnitRow } from "@/lib/unit-actions";
import { useRealtime } from "@/components/providers/realtime-provider";
import { PresenceTd } from "@/components/realtime/presence-td";
import { TableCellContextMenu, type CellInfo } from "@/components/realtime/table-cell-context-menu";
import { useTableCellKeyboard } from "@/hooks/use-table-cell-keyboard";
import { useCellStyles } from "@/hooks/use-cell-styles";

const STALE_DAYS = 7;

function isStaleContact(unit: UnitRow): boolean {
  const raw = unit.last_contact_date;
  if (!raw) return false;
  const date = new Date(String(raw));
  if (isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > STALE_DAYS * 24 * 60 * 60 * 1000;
}

function toDateValue(iso: string): string {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

const INPUT_CLS =
  "block h-full w-full rounded-none border-none bg-transparent px-2.5 py-2 text-[13px] text-foreground caret-primary outline-none transition-colors";

/* -- Cell Input: the cell IS the input -- */
interface CellInputProps {
  colKey: string;
  value: string;
  type: string;
  options?: { value: string; label: string }[];
  editable: boolean;
  ltr?: boolean;
  right?: boolean;
  onSave: (v: string) => void;
}

function CellInput({ colKey, value, type, options, editable, ltr, right, onSave }: CellInputProps) {
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const focusedRef = useRef(false);
  const lastCommittedRef = useRef(value);

  useEffect(() => {
    if (!focusedRef.current) {
      setVal(value);
      lastCommittedRef.current = value;
    }
  }, [value]);

  const commit = useCallback((raw?: string) => {
    const next = raw ?? ref.current?.value ?? "";
    if (next !== value && next !== lastCommittedRef.current) {
      lastCommittedRef.current = next;
      onSave(next);
    }
    focusedRef.current = false;
  }, [value, onSave]);

  const needsSelect = options !== undefined && options.some((o) => o.value !== o.label);
  const dirAttr = ltr ? "ltr" : undefined;
  const alignCls = right ? "text-right" : "";

  if (options !== undefined && needsSelect) {
    return (
      <select
        value={val}
        disabled={!editable}
        dir={dirAttr}
        onChange={(e) => {
          setVal(e.target.value);
          commit(e.target.value);
        }}
        onBlur={() => commit()}
        className={`${INPUT_CLS} ${alignCls} cursor-pointer ${editable ? "" : "disabled:opacity-100 disabled:text-foreground disabled:cursor-default"} ${val ? "" : "text-muted-foreground"}`}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (options !== undefined) {
    const listId = `unit-dl-${colKey}`;
    return (
      <>
        <input
          ref={ref}
          list={listId}
          type="text"
          value={val}
          readOnly={!editable}
          dir={dirAttr}
          onChange={(e) => setVal(e.target.value)}
          onFocus={() => { focusedRef.current = true; }}
          onBlur={() => commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") { setVal(value); (e.target as HTMLInputElement).blur(); }
          }}
          className={`${INPUT_CLS} ${alignCls} ${editable ? "hover:bg-muted/40 focus:bg-muted/50" : "read-only:cursor-default read-only:hover:bg-transparent"} ${val ? "" : "placeholder:text-muted-foreground"}`}
          placeholder={val ? undefined : "—"}
        />
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o.value} value={o.label} />
          ))}
        </datalist>
      </>
    );
  }

  return (
    <input
      ref={ref}
      type={type}
      value={val}
      readOnly={!editable}
      dir={dirAttr}
      onChange={(e) => {
        const v = e.target.value;
        setVal(v);
        if (type === "date") commit(v);
      }}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setVal(value); (e.target as HTMLInputElement).blur(); }
      }}
      className={`${INPUT_CLS} ${alignCls} ${editable ? "hover:bg-muted/40 focus:bg-muted/50" : "read-only:cursor-default read-only:hover:bg-transparent"} ${type === "number" ? "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" : ""}`}
    />
  );
}

/* -- Row -- */
interface RowProps {
  unit: UnitRow;
  columns: ColumnConfig[];
  index: number;
  onCellSave: (uid: string, field: string, value: string) => void;
  isAdmin: boolean;
  onDelete: (uid: string) => void;
  userId: string;
  onContextMenu: (e: React.MouseEvent, info: CellInfo) => void;
  employeeMap: Map<string, string>;
  uniqueValues: { finishing_status: string[]; rent_sale: string[]; unit_type: string[] };
}

const Row = function Row({ unit, columns, index, onCellSave, isAdmin, onDelete, userId, onContextMenu, employeeMap, uniqueValues }: RowProps) {
    const uid = unit.id;
    const stale = isStaleContact(unit);
    return (
      <tr className={stale ? "inspire-stale-contact" : ""} data-row-id={unit.id} data-stale={stale ? "true" : undefined}>
        <td className="border-b border-r px-2.5 py-2 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</td>
        {columns.map((col) => {
          const key = col.key;
          const isOwner = unit.created_by === userId || unit.assigned_employee === userId;
          const canEdit = isAdmin || isOwner || key === "feedback";
          const rawVal = col.is_builtin ? String((unit as Record<string, unknown>)[key] ?? "") : String((unit.custom_fields as Record<string, unknown>)?.[key] ?? "");
          const raw = key === "assigned_employee" ? (employeeMap.get(rawVal) || rawVal) : rawVal;
          const editValue = key === "assigned_employee" ? rawVal : raw;
          const options =
            key === "assigned_employee" ? Array.from(employeeMap.entries()).map(([id, name]) => ({ value: id, label: name })) :
            key === "finishing_status" ? (uniqueValues.finishing_status || []).map((v) => ({ value: v, label: v })) :
            key === "rent_sale" ? (uniqueValues.rent_sale || []).map((v) => ({ value: v, label: v })) :
            key === "unit_type" ? (uniqueValues.unit_type || []).map((v) => ({ value: v, label: v })) :
            col.type === "select" && col.options && col.options.length > 0 ? col.options.map((o) => ({ value: o, label: o })) :
            undefined;
          const editType = options ? "select" : (key === "cash_required" || key === "remaining" ? "number" : key === "last_contact_date" || col.type === "date" ? "date" : "text");
          const ltr = key === "phone" || key === "cash_required" || key === "remaining" || key === "last_contact_date";
          const right = key === "cash_required" || key === "remaining";
          const cellValue = key === "last_contact_date" ? toDateValue(editValue) : editValue;
          return (
            <PresenceTd key={col.id} table="properties" rowId={uid} colKey={key} className="overflow-hidden border-b border-r p-0 align-middle" onContextMenu={onContextMenu}>
              <CellInput
                colKey={key}
                value={cellValue}
                type={editType}
                options={options}
                editable={canEdit}
                ltr={ltr}
                right={right}
                onSave={(v) => onCellSave(uid, key, v)}
              />
            </PresenceTd>
          );
        })}
        <td className="whitespace-nowrap border-b px-2 py-1.5 align-middle">
          <div className="flex items-center gap-0.5">
            <Link href={`/properties/${unit.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"><Eye className="h-4 w-4" /></Link>
            {(isAdmin || unit.created_by === userId || unit.assigned_employee === userId) && (
              <Link href={`/properties/${unit.id}/edit`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></Link>
            )}
            {(isAdmin || unit.created_by === userId) && (
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-red-50 text-red-500 hover:text-red-600" onClick={() => onDelete(uid)}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

export function UnitTable({ columns, units: serverUnits, locale, isAdmin, userId, employeeMap, uniqueValues }: UnitTableProps) {
  const t = useTranslations("Properties");
  const router = useRouter();
  const { notifyCellEdit } = useRealtime();
  const [localUnits, setLocalUnits] = useState(serverUnits);
  const { containerRef, ctrlD } = useTableCellKeyboard(localUnits);
  useCellStyles("properties");
  const enabledColumns = useMemo(() => columns.filter((c) => c.enabled), [columns]);

  const srvRef = useRef(serverUnits); srvRef.current = serverUnits;
  const bgSaveRef = useRef<Set<string>>(new Set());

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [localCols, setLocalCols] = useState(enabledColumns);
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const [ctxMenu, setCtxMenu] = useState<{ info: CellInfo; pos: { x: number; y: number }; shortcut?: { scope: "row" | "column"; target: "color_bg" } } | null>(null);
  const handleContextMenu = useCallback((e: React.MouseEvent, info: CellInfo) => {
    e.preventDefault();
    setCtxMenu({ info, pos: { x: e.clientX, y: e.clientY } });
  }, []);

  const hoverRef = useRef<{ x: number; y: number; rowId: string; colKey: string } | null>(null);
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const td = target.closest("td[data-row-id]");
      if (td) hoverRef.current = { x: e.clientX, y: e.clientY, rowId: td.getAttribute("data-row-id") || "", colKey: td.getAttribute("data-col-key") || "" };
    }
    function onKeyDown(e: KeyboardEvent) {
      if (!e.altKey || !hoverRef.current || ctxMenu) return;
      const h = hoverRef.current;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); setCtxMenu({ info: { table: "properties", rowId: h.rowId, colKey: h.colKey, colLabel: h.colKey, rowData: null }, pos: { x: h.x, y: h.y }, shortcut: { scope: "row", target: "color_bg" } }); }
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setCtxMenu({ info: { table: "properties", rowId: h.rowId, colKey: h.colKey, colLabel: h.colKey, rowData: null }, pos: { x: h.x, y: h.y }, shortcut: { scope: "column", target: "color_bg" } }); }
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("keydown", onKeyDown); };
  }, [ctxMenu]);

  const [deleteDialog, setDeleteDialog] = useState<{ uid: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    function onTableReset(e: Event) {
      const detail = (e as CustomEvent<{ table: string }>).detail;
      if (!detail || detail.table !== "properties") return;
      const defaults: Record<string, number> = {};
      for (const col of enabledColumns) defaults[col.key] = defaultColWidth(col.key);
      setColWidths(defaults);
    }
    window.addEventListener("inspire:table-reset", onTableReset);
    return () => window.removeEventListener("inspire:table-reset", onTableReset);
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

  /* -- Inline cell save -- */
  const cellSave = useCallback((uid: string, key: string, value: string) => {
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

  const handleDelete = useCallback(async (uid: string) => {
    const unit = localUnits.find(u => u.id === uid);
    setDeleteDialog({ uid, name: unit?.customer_name || uid.slice(0, 8) });
  }, [localUnits]);

  const confirmDelete = useCallback(async () => {
    if (!deleteDialog) return;
    const uid = deleteDialog.uid;
    setDeleting(true);
    setLocalUnits((prev) => prev.filter((u) => u.id !== uid));
    try { await deleteUnit(uid); router.refresh(); toast.success("Deleted successfully"); } catch { setLocalUnits(srvRef.current); toast.error("Delete failed"); }
    setDeleting(false);
    setDeleteDialog(null);
  }, [deleteDialog, router]);

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

  return (
    <TooltipProvider>
      <div ref={containerRef} className="overflow-x-auto rounded-lg border">
        <table className="border-collapse text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: 60 }} />
            {localCols.map((col) => (
              <col key={col.id} data-col-key={col.key} style={{ width: colWidths[col.key] ?? defaultColWidth(col.key) }} />
            ))}
            <col style={{ width: ACTIONS_COL_WIDTH }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/40">
              <th className="border-b border-r px-2.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">{t("id")}</th>
              {localCols.map((col, idx) => (
                <th key={col.id}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  onDoubleClick={() => handleDoubleClick(col)}
                  data-col-key={col.key}
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
                <td colSpan={localCols.length + 2} className="px-3 py-12 text-center text-muted-foreground">
                  <Building2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  {t("empty")}
                </td>
              </tr>
            ) : (
              localUnits.map((unit, index) => (
                <Row key={unit.id} unit={unit} columns={localCols} index={index}
                  onCellSave={cellSave}
                  isAdmin={isAdmin} employeeMap={employeeMap} uniqueValues={uniqueValues} onDelete={handleDelete} userId={userId} onContextMenu={handleContextMenu}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <TableCellContextMenu info={ctxMenu?.info ?? null} position={ctxMenu?.pos ?? null} shortcut={ctxMenu?.shortcut ?? null} onClose={() => setCtxMenu(null)} />
      <ConfirmDialog open={!!deleteDialog} onOpenChange={(o) => { if (!o) setDeleteDialog(null); }} title="Confirm Delete" description={`Delete "${deleteDialog?.name}"? This cannot be undone.`} confirmLabel={deleting ? "Deleting..." : "Delete"} cancelLabel="Cancel" variant="destructive" loading={deleting} onConfirm={confirmDelete} />
    </TooltipProvider>
  );
}
