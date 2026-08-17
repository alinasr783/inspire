"use client";

import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { FileSpreadsheet, Trash2, Eye, Pencil } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { UnconfirmedRecord } from "@/lib/unconfirmed-data-actions";
import { deleteRecords, updateRecordField, quickCreateRecord } from "@/lib/unconfirmed-data-actions";
import { useRealtime } from "@/components/providers/realtime-provider";
import { PresenceTd } from "@/components/realtime/presence-td";
import { TableCellContextMenu, type CellInfo } from "@/components/realtime/table-cell-context-menu";
import { useTableCellKeyboard } from "@/hooks/use-table-cell-keyboard";
import { useCellStyles } from "@/hooks/use-cell-styles";
import { useCellNavigation } from "@/hooks/use-cell-navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { showSuccess, showError } from "@/lib/toast-utils";

interface Columns { key: string; label: string; type: string }

const COL_WIDTHS: Record<string, number> = {
  owner_name: 160,
  unit_area: 100,
  building_number: 110,
  unit_number: 110,
  owner_phone: 140,
  owner_phone_alt: 140,
  affiliated_company: 160,
  last_feedback: 180,
  last_contact_date: 130,
  whatsapp_state: 110,
  assigned_employee: 160,
};
const DEFAULT_WIDTH = 150;
const MIN_WIDTH = 50;
const CHECKBOX_WIDTH = 40;
const ACTIONS_WIDTH = 120;
const ID_WIDTH = 44;

/* -- Cell Editor -- */
const CellEditor = memo(({ defaultValue, type, onSave, onCancel }: { defaultValue: string; type: string; onSave: (v: string) => void; onCancel: () => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.focus(); el.select(); } }, []);
  const commit = useCallback(() => onSave(ref.current?.value ?? ""), [onSave]);
  const keyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") onCancel(); }, [commit, onCancel]);
  return <input ref={ref} type={type === "date" ? "date" : "text"} defaultValue={defaultValue} onBlur={commit} onKeyDown={keyDown} className="block w-full h-full border-none outline-none bg-transparent px-0 py-0 text-xs" />;
});
CellEditor.displayName = "CellEditor";

/* -- Cell Display -- */
const CellDisplay = memo(({ col, record, locale, onEdit, onSave, employees }: { col: Columns; record: UnconfirmedRecord; locale: string; onEdit: () => void; onSave: (v: string) => void; employees?: { id: string; name: string }[] }) => {
  const t = useTranslations("UnconfirmedData");
  if (col.key === "whatsapp_state") {
    const s = record.whatsapp_state || "";
    return (
      <select value={s} onChange={(e) => onSave(e.target.value)}
        className={`h-full w-full px-0 py-0 text-xs border-none outline-none bg-transparent cursor-pointer ${s === "send" ? "text-green-700 dark:text-green-300 font-medium" : s === "failed" ? "text-red-700 dark:text-red-300 font-medium" : "text-muted-foreground"}`}>
        <option value="">{t("notSent")}</option>
        <option value="send">{t("sent")}</option>
        <option value="failed">{t("sendFailed")}</option>
      </select>
    );
  }
  if (col.key === "assigned_employee" && employees) {
    const val = (record as Record<string, unknown>)[col.key] as string ?? "";
    return (
      <select value={val} onChange={(e) => onSave(e.target.value)}
        className="h-full w-full px-0 py-0 text-xs border-none outline-none bg-transparent cursor-pointer text-muted-foreground">
        <option value="">{t("selectEmployee")}</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>{e.name}</option>
        ))}
      </select>
    );
  }
  if (col.key === "last_contact_date") {
    const val = record.last_contact_date;
    const text = val ? new Date(val).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "";
    return <span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block truncate">{text || "\u00A0"}</span>;
  }
  const v = (record as Record<string, unknown>)[col.key];
  const dv = v == null || v === "" ? "" : String(v);
  if (!dv) return <span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block truncate min-h-[1.25rem]">&nbsp;</span>;
  return <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block truncate">{dv}</span></TooltipTrigger><TooltipContent side="bottom" align="start" className="max-w-sm whitespace-pre-wrap break-words">{dv}</TooltipContent></Tooltip>;
});
CellDisplay.displayName = "CellDisplay";

/* -- Row -- */
interface RowProps {
  record: UnconfirmedRecord; columns: Columns[]; locale: string; selectable: boolean;
  rowIndex: number;
  isSelected: boolean; editingKey: string | null;
  isActive: boolean; activeColKey: string | null;
  onToggle: (id: string) => void; onDelete: (id: string) => void;
  onCellEdit: (recordId: string, key: string) => void;
  onCellSave: (recordId: string, key: string, value: string) => void;
  onEditCancel: () => void;
  onContextMenu: (e: React.MouseEvent, info: CellInfo) => void;
  onRowMouseEnter: (uid: string) => void;
  onCellMouseEnter: (uid: string, colKey: string) => void;
  employees: { id: string; name: string }[];
}

const Row = function Row({ record, columns, locale, selectable, rowIndex, isSelected, isActive, activeColKey, editingKey, onToggle, onDelete, onCellEdit, onCellSave, onEditCancel, onContextMenu, onRowMouseEnter, onCellMouseEnter, employees }: RowProps) {
  const t = useTranslations("UnconfirmedData");
  return (
    <tr className={`hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""} ${isActive ? "bg-primary/10 dark:bg-muted/40" : ""} scroll-mt-10`} data-row-id={record.id} onMouseEnter={() => onRowMouseEnter(record.id)}>
      {selectable && (
        <td className="border-b border-r px-2 py-2 align-middle">
          <input type="checkbox" checked={isSelected} onChange={() => onToggle(record.id)} className="h-4 w-4 cursor-pointer" />
        </td>
      )}
      <td className="border-b border-r px-2 py-2 align-middle text-xs text-center text-muted-foreground tabular-nums">
        {rowIndex}
      </td>
      {columns.map((col) => {
        const isEdit = editingKey === col.key;
        const isActiveCell = isActive && activeColKey === col.key;
        return (
            <PresenceTd key={col.key} table="unconfirmed" rowId={record.id} colKey={col.key} className={`overflow-hidden border-b border-r align-middle ${isActiveCell ? "bg-primary/15" : ""}`} onContextMenu={onContextMenu}>
            <div className="h-full w-full" onMouseEnter={() => onCellMouseEnter(record.id, col.key)}>
            {isEdit ? (
              <CellEditor defaultValue={col.key === "last_contact_date" ? (record.last_contact_date || "") : String((record as any)[col.key] ?? "")} type={col.type} onSave={(v) => onCellSave(record.id, col.key, v)} onCancel={onEditCancel} />
            ) : (
              <CellDisplay col={col} record={record} locale={locale} onEdit={() => onCellEdit(record.id, col.key)} onSave={(v) => onCellSave(record.id, col.key, v)} employees={employees} />
            )}
            </div>
            </PresenceTd>
        );
      })}
      <td className="whitespace-nowrap border-b px-2 py-2 align-middle">
        <div className="flex items-center gap-0.5">
          <Tooltip><TooltipTrigger><Link href={`/unconfirmed-data/${record.id}`} className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground"><Eye className="h-3.5 w-3.5" /></Link></TooltipTrigger><TooltipContent>{t("viewDetails")}</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger><Link href={`/unconfirmed-data/${record.id}/edit`} className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></Link></TooltipTrigger><TooltipContent>{t("edit")}</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger><span className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-red-50 text-red-500 hover:text-red-600 cursor-pointer" onClick={() => onDelete(record.id)}><Trash2 className="h-3.5 w-3.5" /></span></TooltipTrigger><TooltipContent>{t("delete")}</TooltipContent></Tooltip>
        </div>
      </td>
    </tr>
  );
};

export function UploadsTable({ records: serverRecords, columns, locale, selectable, userId, employees }: { records: UnconfirmedRecord[]; columns: Columns[]; locale: string; selectable?: boolean; userId: string; employees: { id: string; name: string }[] }) {
  const t = useTranslations("UnconfirmedData");
  const { notifyCellEdit } = useRealtime();
  const [records, setRecords] = useState(serverRecords);
  const { containerRef, ctrlD } = useTableCellKeyboard(records);
  useCellStyles("unconfirmed");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selTo, setSelTo] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<{ rid: string; key: string } | null>(null);
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
      if (e.key === "r" || e.key === "R") { e.preventDefault(); setCtxMenu({ info: { table: "unconfirmed", rowId: h.rowId, colKey: h.colKey, colLabel: h.colKey, rowData: null }, pos: { x: h.x, y: h.y }, shortcut: { scope: "row", target: "color_bg" } }); }
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setCtxMenu({ info: { table: "unconfirmed", rowId: h.rowId, colKey: h.colKey, colLabel: h.colKey, rowData: null }, pos: { x: h.x, y: h.y }, shortcut: { scope: "column", target: "color_bg" } }); }
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("keydown", onKeyDown); };
  }, [ctxMenu]);

  const [deleteOneDialog, setDeleteOneDialog] = useState<{ rid: string; name: string } | null>(null);
  const srvRef = useRef(serverRecords); srvRef.current = serverRecords;

  const onEditCell = useCallback((rowId: string, colKey: string) => {
    if (colKey === "whatsapp_state" || colKey === "assigned_employee") return;
    setEditing({ rid: rowId, key: colKey });
  }, []);

  const { activeRowId, activeColKey, handleRowMouseEnter, handleCellMouseEnter } = useCellNavigation(records, columns, onEditCell);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const col of columns) init[col.key] = COL_WIDTHS[col.key] ?? DEFAULT_WIDTH;
    return init;
  });
  const colWidthsRef = useRef(colWidths); colWidthsRef.current = colWidths;

  const prevServerIdsRef = useRef("");
  useEffect(() => {
    const ids = serverRecords.map((r) => r.id).sort().join(",");
    if (ids !== prevServerIdsRef.current) {
      setRecords(serverRecords);
      prevServerIdsRef.current = ids;
    }
  }, [serverRecords]);

  useEffect(() => {
    function onTableReset(e: Event) {
      const detail = (e as CustomEvent<{ table: string }>).detail;
      if (!detail || detail.table !== "unconfirmed") return;
      const defaults: Record<string, number> = {};
      for (const col of columns) defaults[col.key] = COL_WIDTHS[col.key] ?? DEFAULT_WIDTH;
      setColWidths(defaults);
    }
    window.addEventListener("inspire:table-reset", onTableReset);
    return () => window.removeEventListener("inspire:table-reset", onTableReset);
  }, [columns]);

  const handleResizeMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidthsRef.current[colKey] ?? DEFAULT_WIDTH;
    const move = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newW = Math.max(MIN_WIDTH, startWidth + delta);
      const el = document.querySelector(`col[data-col-key="${colKey}"]`) as HTMLElement | null;
      if (el) el.style.width = `${newW}px`;
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const el = document.querySelector(`col[data-col-key="${colKey}"]`) as HTMLElement | null;
      if (el) { const w = parseInt(el.style.width, 10); if (!isNaN(w)) setColWidths((prev) => ({ ...prev, [colKey]: w })); }
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  const ss = new Set(selectedIds);
  const tgl = useCallback((id: string) => setSelectedIds((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]), []);
  const tglAll = useCallback(() => { if (records.length > 0 && selectedIds.length === records.length) setSelectedIds([]); else setSelectedIds(records.map((r) => r.id)); }, [records, selectedIds.length]);
  const selN = useCallback(() => { const n = parseInt(selTo, 10); if (!isNaN(n) && n >= 1) setSelectedIds(records.slice(0, Math.min(n, records.length)).map((r) => r.id)); }, [records, selTo]);
  const delBulk = useCallback(async () => { if (selectedIds.length === 0) return; if (!window.confirm(`Delete ${selectedIds.length} selected records?`)) return; setDeleting(true); const ids = [...selectedIds]; setSelectedIds([]); setRecords((p) => p.filter((r) => !ids.includes(r.id))); try { await deleteRecords(ids); showSuccess(`${ids.length} deleted`); } catch { setRecords(srvRef.current); showError("Bulk delete failed"); } setDeleting(false); }, [selectedIds]);
  const delOne = useCallback((id: string) => {
    const rec = records.find(r => r.id === id);
    setDeleteOneDialog({ rid: id, name: rec?.owner_name || id.slice(0, 8) });
  }, [records]);

  const confirmDeleteOne = useCallback(async () => {
    if (!deleteOneDialog) return;
    const id = deleteOneDialog.rid;
    setDeleting(true);
    setRecords((p) => p.filter((r) => r.id !== id));
    setSelectedIds((p) => p.filter((i) => i !== id));
    try { await deleteRecords([id]); showSuccess("Deleted"); } catch { setRecords(srvRef.current); showError("Delete failed"); }
    setDeleting(false);
    setDeleteOneDialog(null);
  }, [deleteOneDialog]);
  const cellEdit = useCallback((rid: string, key: string) => setEditing({ rid, key }), []);
  const cellSave = useCallback((rid: string, key: string, val: string) => { setEditing(null); const shouldAutoAssign = (key === "whatsapp_state" && val !== "") || (key === "last_feedback" && val.trim() !== ""); setRecords((p) => p.map((r) => { if (r.id !== rid) return r; const updates: Record<string, unknown> = { [key]: val }; if (shouldAutoAssign) updates.assigned_employee = userId; return { ...r, ...updates }; })); notifyCellEdit({ table: "unconfirmed_records", rowId: rid, field: key, action: "update" }); updateRecordField(rid, key, val).catch(() => {}); }, [notifyCellEdit, userId]);
  const editCancel = useCallback(() => setEditing(null), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key === "d") {
        ctrlD(cellSave, (rowId, colKey) => {
          const idx = records.findIndex((r) => r.id === rowId);
          if (idx <= 0) return null;
          const prev = records[idx - 1] as Record<string, unknown>;
          const val = prev[colKey];
          return (val != null && val !== "") ? String(val) : null;
        });
      }
      if (e.altKey && e.key === "n") {
        e.preventDefault();
        quickCreateRecord().then((newRecord) => {
          setRecords((prev) => [newRecord, ...prev]);
        }).catch(() => {});
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ctrlD, cellSave, records]);
  if (records.length === 0) return <div className="px-3 py-12 text-center text-muted-foreground"><FileSpreadsheet className="mx-auto mb-2 h-8 w-8 opacity-50" />{t("empty")}</div>;
  const ed = editing;

  return (
    <div className="space-y-3">
      {selectable && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm"><input type="checkbox" checked={records.length > 0 && selectedIds.length === records.length} onChange={tglAll} className="h-4 w-4" />{t("selectAll")}</label>
          <div className="flex items-center gap-1.5 text-sm"><span className="text-muted-foreground">{t("selectTo")}</span><Input type="number" min={1} max={records.length} value={selTo} onChange={(e) => setSelTo(e.target.value)} className="h-8 w-20 text-sm" placeholder={String(records.length)} /><Button size="sm" variant="outline" onClick={selN}>Go</Button></div>
          {selectedIds.length > 0 && <Button variant="destructive" size="sm" className="gap-1.5" onClick={delBulk} disabled={deleting}><Trash2 className="h-4 w-4" />{t("deleteSelected", { count: selectedIds.length })}</Button>}
        </div>
      )}
      <div ref={containerRef}>
        <table className="border-separate border-spacing-0 text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            {selectable && <col style={{ width: CHECKBOX_WIDTH }} />}
            <col style={{ width: ID_WIDTH }} />
            {columns.map((col) => (
              <col key={col.key} data-col-key={col.key} style={{ width: colWidths[col.key] ?? COL_WIDTHS[col.key] ?? DEFAULT_WIDTH }} />
            ))}
            <col style={{ width: ACTIONS_WIDTH }} />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/95 backdrop-blur-sm">
              {selectable && <th className="border-b border-r px-2 py-2"><input type="checkbox" checked={records.length > 0 && selectedIds.length === records.length} onChange={tglAll} className="h-4 w-4 cursor-pointer" /></th>}
              <th className="border-b border-r px-2 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">#</th>
              {columns.map((col) => (
                <th key={col.key} data-col-key={col.key} className="relative select-none border-b border-r px-2 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                  <span>{col.label}</span>
                  <div draggable={false} className="absolute bottom-0 top-0 z-10 -right-px w-2 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors"
                    onMouseDown={(e) => handleResizeMouseDown(e, col.key)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderRight = "2px solid var(--primary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderRight = "2px solid transparent"; }}
                  />
                </th>
              ))}
              <th className="border-b px-3 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => (
              <Row key={r.id} record={r} columns={columns} locale={locale} selectable={!!selectable} rowIndex={idx + 1} isSelected={ss.has(r.id)}
                editingKey={ed?.rid === r.id ? ed.key : null}
                onToggle={tgl} onDelete={delOne} onCellEdit={cellEdit} onCellSave={cellSave} onEditCancel={editCancel} onContextMenu={handleContextMenu} onRowMouseEnter={handleRowMouseEnter} onCellMouseEnter={handleCellMouseEnter} isActive={activeRowId === r.id} activeColKey={activeColKey} employees={employees}
              />
            ))}
          </tbody>
        </table>
      </div>
      <TableCellContextMenu info={ctxMenu?.info ?? null} position={ctxMenu?.pos ?? null} shortcut={ctxMenu?.shortcut ?? null} onClose={() => setCtxMenu(null)} />
      <ConfirmDialog open={!!deleteOneDialog} onOpenChange={(o) => { if (!o) setDeleteOneDialog(null); }} title="Confirm Delete" description={`Delete "${deleteOneDialog?.name}"? This cannot be undone.`} confirmLabel={deleting ? "Deleting..." : "Delete"} cancelLabel="Cancel" variant="destructive" loading={deleting} onConfirm={confirmDeleteOne} />
    </div>
  );
}
