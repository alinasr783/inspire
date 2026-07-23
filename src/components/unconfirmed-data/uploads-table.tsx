"use client";

import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { FileSpreadsheet, Trash2, Eye, Pencil } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { UnconfirmedRecord } from "@/lib/unconfirmed-data-actions";
import { deleteRecords, updateRecordField } from "@/lib/unconfirmed-data-actions";

interface Columns { key: string; label: string; type: string }

/* ── Cell Editor ── */
const CellEditor = memo(({ defaultValue, type, onSave, onCancel }: { defaultValue: string; type: string; onSave: (v: string) => void; onCancel: () => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.focus(); el.select(); } }, []);
  const commit = useCallback(() => onSave(ref.current?.value ?? ""), [onSave]);
  const keyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") onCancel(); }, [commit, onCancel]);
  return <input ref={ref} type={type === "date" ? "date" : "text"} defaultValue={defaultValue} onBlur={commit} onKeyDown={keyDown} className="block w-full h-full border-none outline-none bg-transparent px-3 py-2 text-xs" />;
});
CellEditor.displayName = "CellEditor";

/* ── Cell Display ── */
const CellDisplay = memo(({ col, record, locale, onEdit, onSave }: { col: Columns; record: UnconfirmedRecord; locale: string; onEdit: () => void; onSave: (v: string) => void }) => {
  const t = useTranslations("UnconfirmedData");

  if (col.key === "whatsapp_state") {
    const s = record.whatsapp_state || "";
    return (
      <select
        value={s}
        onChange={(e) => onSave(e.target.value)}
        className={`h-full w-full px-3 py-2 text-xs border-none outline-none bg-transparent cursor-pointer ${
          s === "send" ? "text-green-700 dark:text-green-300 font-medium" :
          s === "failed" ? "text-red-700 dark:text-red-300 font-medium" :
          "text-muted-foreground"
        }`}
      >
        <option value="">{t("notSent")}</option>
        <option value="send">{t("sent")}</option>
        <option value="failed">{t("sendFailed")}</option>
      </select>
    );
  }
  if (col.key === "last_contact_date") {
    const val = record.last_contact_date;
    const text = val ? new Date(val).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "";
    return <span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-3 py-2 block truncate">{text || "\u00A0"}</span>;
  }
  const v = (record as Record<string, unknown>)[col.key];
  const dv = v == null || v === "" ? "" : String(v);
  if (!dv) return <span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-3 py-2 block truncate min-h-[1.25rem]">&nbsp;</span>;
  return <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-3 py-2 block truncate">{dv}</span></TooltipTrigger><TooltipContent side="bottom" align="start" className="max-w-sm whitespace-pre-wrap break-words">{dv}</TooltipContent></Tooltip>;
});
CellDisplay.displayName = "CellDisplay";

/* ── Row ── */
interface RowProps {
  record: UnconfirmedRecord; columns: Columns[]; locale: string; selectable: boolean;
  isSelected: boolean; columnWidths: Record<string, number>;
  editingKey: string | null;
  onToggle: (id: string) => void; onDelete: (id: string) => void;
  onCellEdit: (recordId: string, key: string) => void;
  onCellSave: (recordId: string, key: string, value: string) => void;
  onEditCancel: () => void;
}

const Row = memo(({ record, columns, locale, selectable, isSelected, columnWidths, editingKey, onToggle, onDelete, onCellEdit, onCellSave, onEditCancel }: RowProps) => {
  const t = useTranslations("UnconfirmedData");
  return (
    <tr className={`hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}>
      {selectable && (
        <td className="w-10 px-2 py-2 border-r border-b align-middle sticky left-0 bg-inherit">
          <input type="checkbox" checked={isSelected} onChange={() => onToggle(record.id)} className="h-4 w-4 cursor-pointer" />
        </td>
      )}
      {columns.map((col) => {
        const w = columnWidths[col.key];
        const isEdit = editingKey === col.key;
        return (
          <td key={col.key} className="relative border-r border-b align-middle overflow-hidden" style={columnWidths[col.key] ? { width: columnWidths[col.key] } : undefined}>
            {isEdit ? (
              <CellEditor
                defaultValue={col.key === "last_contact_date" ? (record.last_contact_date || "") : String((record as any)[col.key] ?? "")}
                type={col.type}
                onSave={(v) => onCellSave(record.id, col.key, v)}
                onCancel={onEditCancel}
              />
            ) : (
              <CellDisplay col={col} record={record} locale={locale} onEdit={() => onCellEdit(record.id, col.key)} onSave={(v) => onCellSave(record.id, col.key, v)} />
            )}
          </td>
        );
      })}
      <td className="px-3 py-2 border-b align-middle whitespace-nowrap w-28">
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger>
              <Link href={`/unconfirmed-data/${record.id}`} className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>{t("viewDetails")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Link href={`/unconfirmed-data/${record.id}/edit`} className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>{t("edit")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-red-50 text-red-500 hover:text-red-600 cursor-pointer" onClick={() => onDelete(record.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent>{t("delete")}</TooltipContent>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
});
Row.displayName = "Row";

/* ── Main ── */
export function UploadsTable({ records: serverRecords, columns, locale, selectable }: { records: UnconfirmedRecord[]; columns: Columns[]; locale: string; selectable?: boolean }) {
  const t = useTranslations("UnconfirmedData");
  const [records, setRecords] = useState(serverRecords);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selTo, setSelTo] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<{ rid: string; key: string } | null>(null);
  const bgSaveRef = useRef<Set<string>>(new Set());
  const srvRef = useRef(serverRecords); srvRef.current = serverRecords;
  const [cw, setCw] = useState<Record<string, number>>({});
  const dragRef = useRef<{ key: string; sx: number; sw: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef(columns); colsRef.current = columns;

  useEffect(() => {
    const sel = !!selectable;
    const mv = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const w = Math.max(30, d.sw + e.clientX - d.sx);
      const th = tableRef.current?.querySelector(`th[data-col="${d.key}"]`) as HTMLElement | null;
      if (th) th.style.width = w + "px";
      const idx = colsRef.current.findIndex((c) => c.key === d.key);
      if (idx >= 0 && tableRef.current) {
        const cn = idx + (sel ? 2 : 1);
        tableRef.current.querySelectorAll(`tbody td:nth-child(${cn})`).forEach((td) => {
          (td as HTMLElement).style.width = w + "px";
        });
      }
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      document.body.style.cursor = "";
      if (d) {
        const th = tableRef.current?.querySelector(`th[data-col="${d.key}"]`) as HTMLElement | null;
        if (th) setCw((p) => ({ ...p, [d.key]: th.offsetWidth }));
      }
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  useEffect(() => { setRecords(serverRecords); }, [serverRecords]);

  const ss = new Set(selectedIds);

  const tgl = useCallback((id: string) => setSelectedIds((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]), []);
  const tglAll = useCallback(() => { if (records.length > 0 && selectedIds.length === records.length) setSelectedIds([]); else setSelectedIds(records.map((r) => r.id)); }, [records, selectedIds.length]);
  const selN = useCallback(() => { const n = parseInt(selTo, 10); if (!isNaN(n) && n >= 1) setSelectedIds(records.slice(0, Math.min(n, records.length)).map((r) => r.id)); }, [records, selTo]);

  const delBulk = useCallback(async () => {
    if (selectedIds.length === 0) return; setDeleting(true); const ids = [...selectedIds]; setSelectedIds([]); setRecords((p) => p.filter((r) => !ids.includes(r.id)));
    try { await deleteRecords(ids); } catch { setRecords(srvRef.current); } setDeleting(false);
  }, [selectedIds]);

  const delOne = useCallback((id: string) => { setRecords((p) => p.filter((r) => r.id !== id)); setSelectedIds((p) => p.filter((i) => i !== id)); deleteRecords([id]).catch(() => setRecords(srvRef.current)); }, []);

  const cellEdit = useCallback((rid: string, key: string) => setEditing({ rid, key }), []);
  const cellSave = useCallback((rid: string, key: string, val: string) => {
    setEditing(null); setRecords((p) => p.map((r) => (r.id === rid ? { ...r, [key]: val } : r)));
    const tag = rid + key; if (!bgSaveRef.current.has(tag)) { bgSaveRef.current.add(tag); updateRecordField(rid, key, val).finally(() => bgSaveRef.current.delete(tag)); }
  }, []);
  const editCancel = useCallback(() => setEditing(null), []);
  const startResize = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest("th") as HTMLElement;
    dragRef.current = { key: colKey, sx: e.clientX, sw: th.offsetWidth };
    document.body.style.cursor = "col-resize";
  }, []);

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
      <div ref={tableRef} className="overflow-x-auto rounded-lg border">
        <table className="text-sm border-collapse table-fixed">
          <thead><tr className="bg-muted/40">
            {selectable && <th className="w-10 px-2 py-2 border-r border-b sticky left-0 bg-muted/40 z-10"><input type="checkbox" checked={records.length > 0 && selectedIds.length === records.length} onChange={tglAll} className="h-4 w-4 cursor-pointer" /></th>}
            {columns.map((col) => (
                <th key={col.key} data-col={col.key} className="relative px-3 py-2 text-start font-medium whitespace-nowrap border-r border-b text-xs uppercase tracking-wide select-none" style={cw[col.key] ? { width: cw[col.key] } : undefined}>
                  {col.label}
                  <div
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize group"
                    onMouseDown={(e) => startResize(e, col.key)}
                  >
                    <div className="absolute left-1/2 -translate-x-px top-0 h-full w-0.5 bg-border/60 group-hover:bg-primary/60" />
                  </div>
                </th>
            ))}
            <th className="px-3 py-2 text-start font-medium whitespace-nowrap border-b text-xs uppercase tracking-wide w-28">{t("actions")}</th>
          </tr></thead>
          <tbody>
            {records.map((r) => (
              <Row key={r.id} record={r} columns={columns} locale={locale} selectable={!!selectable} isSelected={ss.has(r.id)} columnWidths={cw}
                editingKey={ed?.rid === r.id ? ed.key : null}
                onToggle={tgl} onDelete={delOne} onCellEdit={cellEdit} onCellSave={cellSave} onEditCancel={editCancel}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
