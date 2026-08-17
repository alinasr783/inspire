"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Building2, Trash2, Eye, Pencil, AlertTriangle } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { updateColumnOrder, renameColumnConfig, type ColumnConfig } from "@/lib/unit-config-actions";
import { updateUnitField, quickCreateUnit, deleteUnit, highlightRow, type UnitRow } from "@/lib/unit-actions";
import { useRealtime } from "@/components/providers/realtime-provider";
import { PresenceTd } from "@/components/realtime/presence-td";
import { TableCellContextMenu, type CellInfo } from "@/components/realtime/table-cell-context-menu";
import { useTableCellKeyboard } from "@/hooks/use-table-cell-keyboard";
import { useCellStyles } from "@/hooks/use-cell-styles";
import { useCellNavigation } from "@/hooks/use-cell-navigation";
import { showSuccess, showError, showWarning } from "@/lib/toast-utils";

const STALE_DAYS = 30;

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
  customer_name: 180, phone: 140, compound_name: 160, area: 100,
  building_number: 110, finishing_status: 150, rent_sale: 110,
  unit_type: 120, cash_required: 130, remaining: 130,
  last_contact_date: 130, additional_notes: 180, feedback: 220,
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
  duplicatePhones: Set<string>;
}

/* -- Cell Editor (click-to-edit) -- */
const CellEditor = memo(({ defaultValue, type, options, colKey, onSave, onCancel }: {
  defaultValue: string; type: string; options?: { value: string; label: string }[];
  colKey?: string; onSave: (v: string) => void; onCancel: () => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.focus(); el.select(); } const sel = selectRef.current; if (sel) sel.focus(); }, []);

  const commit = useCallback((forcedVal?: string) => {
    const val = forcedVal ?? ref.current?.value ?? selectRef.current?.value ?? "";
    onSave(val);
  }, [onSave]);

  const keyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") onCancel();
  }, [commit, onCancel]);

  if (options !== undefined && options.length > 0) {
    const isValueLabel = options.some((o) => o.value !== o.label);
    if (isValueLabel) {
      return (
        <select
          ref={selectRef}
          defaultValue={defaultValue}
          onBlur={() => commit()}
          onChange={(e) => commit(e.target.value)}
          className="block h-full w-full border-none bg-transparent px-2.5 py-2 text-[13px] outline-none cursor-pointer"
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }
    const listId = `unit-dl-edit-${colKey}`;
    return (
      <>
        <input ref={ref} list={listId} type="text" defaultValue={defaultValue} onBlur={() => commit()} onKeyDown={keyDown}
          className="block h-full w-full border-none bg-transparent px-2.5 py-2 text-[13px] outline-none" />
        <datalist id={listId}>
          {options.map((o) => <option key={o.value} value={o.label} />)}
        </datalist>
      </>
    );
  }

  return (
    <input ref={ref}
      type={type === "date" ? "date" : type === "number" ? "number" : "text"}
      defaultValue={defaultValue}
      onBlur={() => commit()}
      onKeyDown={keyDown}
      className={`block h-full w-full border-none bg-transparent px-2.5 py-2 text-[13px] outline-none ${type === "number" ? "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" : ""}`}
    />
  );
});
CellEditor.displayName = "CellEditor";

/* -- Cell Display (click-to-edit trigger) -- */
const CellDisplay = memo(({ raw, ltr, right, locale, onEdit }: {
  raw: string; ltr?: boolean; right?: boolean; locale: string; onEdit: () => void;
}) => {
  const dirAttr = ltr ? "ltr" : undefined;
  const alignCls = right ? "text-right" : "";
  const display = raw || "\u00A0";

  return (
    <span onClick={onEdit} dir={dirAttr}
      className={`block h-full w-full cursor-pointer truncate px-2.5 py-2 text-[13px] text-foreground hover:bg-muted/50 ${alignCls} ${!raw ? "text-muted-foreground" : ""}`}>
      {display}
    </span>
  );
});
CellDisplay.displayName = "CellDisplay";

/* -- Memoized Table Row -- */
interface TableRowProps {
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
  editing: { uid: string; colId: string } | null;
  cellEdit: (uid: string, colId: string) => void;
  editCancel: () => void;
  stale: boolean;
  getCellInfo: (col: ColumnConfig, unit: UnitRow) => {
    raw: string; editValue: string; cellValue: string;
    options?: { value: string; label: string }[];
    editType: string; ltr: boolean; right: boolean; canEdit: boolean;
  };
  locale: string;
  duplicatePhones: Set<string>;
  isSelected: boolean;
  activeColKey: string | null;
  onRowMouseEnter: (uid: string) => void;
  onCellMouseEnter: (uid: string, colKey: string) => void;
}

const TableRowComponent = memo(function TableRowComponent({
  unit, columns, index, onCellSave, isAdmin, onDelete, userId, onContextMenu,
  employeeMap, uniqueValues, editing, cellEdit, editCancel, stale, getCellInfo, locale, duplicatePhones,
  isSelected, activeColKey, onRowMouseEnter, onCellMouseEnter,
}: TableRowProps) {
  const uid = unit.id;
  const ed = editing;
  const isDuplicatePhone = !!(unit.phone && duplicatePhones.has(unit.phone));

  const highlightBg = unit.highlight === "green" ? "#dcfce7" : unit.highlight === "red" ? "#fee2e2" : undefined;

  const handleDeleteClick = useCallback(() => onDelete(uid), [onDelete, uid]);

  return (
    <tr
      className={`border-b last:border-0 hover:bg-muted/30 ${stale ? "inspire-stale-contact" : ""} ${isSelected ? "bg-primary/10 dark:bg-muted/40" : ""} scroll-mt-10`}
      data-row-id={uid}
      data-stale={stale ? "true" : undefined}
      onMouseEnter={() => onRowMouseEnter(uid)}
    >
      <td className="border-b border-r px-2.5 py-2 text-center text-xs tabular-nums text-muted-foreground" style={highlightBg ? { backgroundColor: highlightBg } : undefined}>{index + 1}</td>
      {columns.map((col) => {
        const key = col.key;
        const isEdit = ed?.uid === uid && ed?.colId === col.id;
        const info = getCellInfo(col, unit);
        const isActiveCell = isSelected && activeColKey === key;

        return (
          <PresenceTd key={col.id} table="properties" rowId={uid} colKey={key}
            className={`overflow-hidden border-b border-r p-0 align-middle ${isActiveCell ? "bg-primary/15" : ""}`}
            style={highlightBg ? { backgroundColor: highlightBg } : undefined}
            onContextMenu={onContextMenu}>
            {isEdit ? (
              <CellEditor
                defaultValue={info.cellValue}
                type={info.editType}
                options={info.options}
                colKey={key}
                onSave={(v) => onCellSave(uid, key, v)}
                onCancel={editCancel}
              />
            ) : (
              <span className="relative block h-full w-full" onMouseEnter={() => onCellMouseEnter(uid, key)}>
                <CellDisplay
                  raw={key === "last_contact_date" ? toDateValue(info.raw) : info.raw}
                  ltr={info.ltr}
                  right={info.right}
                  locale={locale}
                  onEdit={() => {
                    if (info.canEdit) {
                      cellEdit(uid, col.id);
                    } else {
                      showError("ليس لديك صلاحية لتعديل هذا العقار. يمكنك فقط تعديل العقارات التي قمت بإنشائها أو التي تم تعيينك كموظف مسؤول عنها.");
                    }
                  }}
                />
                {key === "phone" && (!unit.phone || isDuplicatePhone) && (
                  <span className="absolute end-1 top-1/2 -translate-y-1/2 text-red-500" title={locale === "ar" ? "رقم مكرر" : "Duplicate number"}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </span>
                )}
              </span>
            )}
          </PresenceTd>
        );
      })}
      <td className="whitespace-nowrap border-b px-2 py-1.5 align-middle" style={highlightBg ? { backgroundColor: highlightBg } : undefined}>
        <div className="flex items-center gap-0.5">
          <Link href={`/properties/${uid}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"><Eye className="h-4 w-4" /></Link>
          {(isAdmin || unit.created_by === userId || unit.assigned_employee === userId) && (
            <Link href={`/properties/${uid}/edit`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></Link>
          )}
          {(isAdmin || unit.created_by === userId || unit.assigned_employee === userId) && (
            <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-red-50 text-red-500 hover:text-red-600" onClick={handleDeleteClick}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

export function UnitTable({ columns, units: serverUnits, locale, isAdmin, userId, employeeMap, uniqueValues, duplicatePhones }: UnitTableProps) {
  const t = useTranslations("Properties");
  const router = useRouter();
  const { notifyCellEdit } = useRealtime();
  const [localUnits, setLocalUnits] = useState(serverUnits);
  const { containerRef, ctrlD } = useTableCellKeyboard(localUnits);
  useCellStyles("properties");
  const enabledColumns = useMemo(() => columns.filter((c) => c.enabled), [columns]);

  const srvRef = useRef(serverUnits); srvRef.current = serverUnits;
  const bgSaveRef = useRef<Set<string>>(new Set());

  const dragIdxRef = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [localCols, setLocalCols] = useState(enabledColumns);
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<{ uid: string; colId: string } | null>(null);
  const cellEdit = useCallback((uid: string, colId: string) => setEditing({ uid, colId }), []);
  const editCancel = useCallback(() => setEditing(null), []);

  const onEditCell = useCallback((rowId: string, colKey: string) => {
    const col = localCols.find((c) => c.key === colKey);
    if (col) cellEdit(rowId, col.id);
  }, [localCols, cellEdit]);

  const { activeRowId, activeColKey, handleRowMouseEnter, handleCellMouseEnter } = useCellNavigation(localUnits, localCols, onEditCell);

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

  useEffect(() => {
    setLocalUnits((prev) => {
      const serverIds = new Set(serverUnits.map((u) => u.id));
      const prevIds = new Set(prev.map((u) => u.id));
      const sameSize = serverIds.size === prevIds.size;
      const allInServer = [...prevIds].every((id) => serverIds.has(id));
      if (sameSize && allInServer) return prev;
      const newUnits = serverUnits.filter((u) => !prevIds.has(u.id));
      const filtered = prev.filter((u) => serverIds.has(u.id));
      return [...newUnits, ...filtered];
    });
  }, [serverUnits]);
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

  // Optimized column reorder with ref to reduce re-renders
  const handleDragStart = useCallback((idx: number) => {
    dragIdxRef.current = idx;
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdxRef.current === null || dragIdxRef.current === idx) return;
    const reordered = [...localCols];
    const [moved] = reordered.splice(dragIdxRef.current, 1);
    reordered.splice(idx, 0, moved);
    dragIdxRef.current = idx;
    setLocalCols(reordered);
    setDragIdx(idx);
  }, [localCols]);

  const handleDrop = useCallback(async () => {
    const finalCols = [...localCols];
    dragIdxRef.current = null;
    setDragIdx(null);
    const updated = finalCols.map((col, i) => ({ id: col.id, sort_order: i }));
    await updateColumnOrder(updated);
    router.refresh();
  }, [localCols, router]);

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

  const cellSave = useCallback((uid: string, key: string, value: string) => {
    setEditing(null);
    const prevUnits = srvRef.current;
    setLocalUnits((prev) => prev.map((u) => {
      if (u.id !== uid) return u;
      if (unitsBuiltin.current.has(key)) return { ...u, [key]: value } as UnitRow;
      const cf = { ...(u.custom_fields as Record<string, unknown>), [key]: value.trim() || null };
      return { ...u, custom_fields: cf } as UnitRow;
    }));
    notifyCellEdit({ table: "units", rowId: uid, field: key, action: "update" });
    const tag = uid + key;
    if (!bgSaveRef.current.has(tag)) {
      bgSaveRef.current.add(tag);
      updateUnitField(uid, key, value)
        .catch((e: Error) => {
          setLocalUnits(prevUnits);
          if (e.message === "unauthorized") {
            showError("ليس لديك صلاحية لتعديل هذا العقار. يمكنك فقط تعديل العقارات التي قمت بإنشائها أو التي تم تعيينك كموظف مسؤول عنها.");
          } else {
            showError(e?.message || "Update failed");
          }
        })
        .finally(() => bgSaveRef.current.delete(tag));
    }
  }, [notifyCellEdit]);

  const handleDelete = useCallback(async (uid: string) => {
    const unit = localUnits.find((u) => u.id === uid);
    setDeleteDialog({ uid, name: unit?.customer_name || uid.slice(0, 8) });
  }, [localUnits]);

  const confirmDelete = useCallback(async () => {
    if (!deleteDialog) return;
    const uid = deleteDialog.uid;
    setDeleting(true);
    setLocalUnits((prev) => prev.filter((u) => u.id !== uid));
    try { await deleteUnit(uid); showSuccess(t("deletedSuccess")); } catch (e: any) { setLocalUnits(srvRef.current); if (e.message === "unauthorized") { showError("ليس لديك صلاحية لحذف هذا العقار. يمكنك فقط حذف العقارات التي قمت بإنشائها أو التي تم تعيينك كموظف مسؤول عنها."); } else if (e.message === "not-found") { showError("العقار غير موجود"); } else { showError(e?.message || t("deleteFailed")); } }
    setDeleting(false);
    setDeleteDialog(null);
  }, [deleteDialog]);

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
      if (e.altKey && e.key === "n") {
        e.preventDefault();
        quickCreateUnit(userId).then((newUnit) => {
          setLocalUnits((prev) => [newUnit, ...prev]);
        }).catch(() => {});
      }
      if (e.altKey && (e.key === "g" || e.key === "h")) {
        e.preventDefault();
        const h = hoverRef.current;
        if (h) {
          const color = e.key === "g" ? "green" : "red";
          const unit = localUnits.find((u) => u.id === h.rowId);
          const currentHighlight = unit?.highlight;
          const newColor = currentHighlight === color ? null : color;
          setLocalUnits((prev) => prev.map((u) =>
            u.id === h.rowId ? { ...u, highlight: newColor } as UnitRow : u
          ));
          highlightRow(h.rowId, newColor).catch((err: Error) => {
            if (err.message === "unauthorized") {
              showError("ليس لديك صلاحية لتمييز هذا العقار. يمكنك فقط تمييز العقارات التي قمت بإنشائها أو التي تم تعيينك كموظف مسؤول عنها.");
            } else {
              showError(err?.message || "Highlight failed");
            }
            setLocalUnits(srvRef.current);
          });
          const label = e.key === "g" ? "green" : "red";
          showSuccess(`تم ${newColor ? "تمييز" : "إلغاء تمييز"} الصف باللون ${label === "green" ? "الأخضر" : "الأحمر"}`);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ctrlD, cellSave, localUnits]);

  // Pre-compute cell info function for each column+unit combination
  const getCellInfo = useCallback((col: ColumnConfig, unit: UnitRow) => {
    const key = col.key;
    const isOwner = unit.created_by === userId || unit.assigned_employee === userId;
    const canEdit = isAdmin || isOwner;
    const rawVal = col.is_builtin ? String((unit as Record<string, unknown>)[key] ?? "") : String((unit.custom_fields as Record<string, unknown>)?.[key] ?? "");
    const raw = key === "assigned_employee" ? (employeeMap.get(rawVal) || "—") : rawVal;
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

    return { raw, editValue, cellValue, options, editType, ltr, right, canEdit };
  }, [isAdmin, userId, employeeMap, uniqueValues]);

  // Pre-compute stale status for all units
  const staleMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const u of localUnits) map.set(u.id, isStaleContact(u));
    return map;
  }, [localUnits]);

  return (
    <TooltipProvider>
      <div ref={containerRef}>
        <table className="border-separate border-spacing-0 text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: 60 }} />
            {localCols.map((col) => (
              <col key={col.id} data-col-key={col.key} style={{ width: colWidths[col.key] ?? defaultColWidth(col.key) }} />
            ))}
            <col style={{ width: ACTIONS_COL_WIDTH }} />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/95 backdrop-blur-sm">
              <th className="border-b border-r px-2.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">{t("id")}</th>
              {localCols.map((col, idx) => (
                <th key={col.id}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  onDoubleClick={() => handleDoubleClick(col)}
                  data-col-key={col.key}
                  className={`relative select-none border-b border-r px-1.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap ${dragIdx === idx ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-1 pr-3" draggable onDragStart={() => handleDragStart(idx)}>
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
              <th className="border-b px-3 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">{t("actions")}</th>
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
                <TableRowComponent
                  key={unit.id}
                  unit={unit}
                  columns={localCols}
                  index={index}
                  onCellSave={cellSave}
                  isAdmin={isAdmin}
                  employeeMap={employeeMap}
                  uniqueValues={uniqueValues}
                  onDelete={handleDelete}
                  userId={userId}
                  onContextMenu={handleContextMenu}
                  editing={editing}
                  cellEdit={cellEdit}
                  editCancel={editCancel}
                  stale={staleMap.get(unit.id) ?? false}
                  getCellInfo={getCellInfo}
                  locale={locale}
                  duplicatePhones={duplicatePhones}
                  isSelected={activeRowId === unit.id}
                  activeColKey={activeColKey}
                  onRowMouseEnter={handleRowMouseEnter}
                  onCellMouseEnter={handleCellMouseEnter}
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
