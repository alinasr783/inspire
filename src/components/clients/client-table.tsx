"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Users } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { updateColumnOrder, renameColumnConfig, type ColumnConfig } from "@/lib/client-config-actions";
import { updateClientField } from "@/lib/client-actions";
import { useRealtime } from "@/components/providers/realtime-provider";
import { PresenceTd } from "@/components/realtime/presence-td";
import { useTableCellKeyboard } from "@/hooks/use-table-cell-keyboard";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

type ClientRow = Record<string, unknown> & {
  id: string;
  custom_fields: Record<string, unknown>;
};

const COL_WIDTHS: Record<string, number> = {
  customer_name: 160, phone: 140, phone_alt: 140, budget_from: 130, budget_to: 130,
  payment_method: 120, preferred_area: 140, unit_type: 120, bedrooms: 100,
  preferred_developer: 150, source: 130, additional_notes: 180, last_contact_date: 130,
  assigned_employee: 150, created_by: 140,
};
const DEFAULT_WIDTH = 150;
const MIN_WIDTH = 50;
const ACTIONS_WIDTH = 130;

interface ClientTableProps {
  columns: ColumnConfig[];
  clients: ClientRow[];
  locale: string;
  creatorMap: Map<string, string>;
  employeeMap: Map<string, string>;
  userId: string;
}

/* -- Cell Editor -- */
const CellEditor = memo(({ defaultValue, type, onSave, onCancel }: { defaultValue: string; type: string; onSave: (v: string) => void; onCancel: () => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.focus(); el.select(); } }, []);
  const commit = useCallback(() => onSave(ref.current?.value ?? ""), [onSave]);
  const keyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") onCancel(); }, [commit, onCancel]);
  return <input ref={ref} type={type === "date" ? "date" : type === "number" ? "number" : "text"} defaultValue={defaultValue} onBlur={commit} onKeyDown={keyDown} className="block h-full w-full border-none bg-transparent px-3 py-2 text-xs outline-none" />;
});
CellEditor.displayName = "CellEditor";

/* -- Cell Display -- */
const CellDisplay = memo(({ col, raw, locale, onEdit }: { col: ColumnConfig; raw: string; locale: string; onEdit: () => void }) => {
  if (!raw) return <span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-3 py-2 block truncate min-h-[1.25rem]">&nbsp;</span>;

  if (col.key === "payment_method") {
    return (
      <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-3 py-2 block truncate">
        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">{raw}</span>
      </span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>
    );
  }
  if (col.key === "unit_type") {
    return (
      <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-3 py-2 block truncate">
        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-200">{raw}</span>
      </span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>
    );
  }
  if (col.key === "source") {
    return (
      <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-3 py-2 block truncate">
        <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">{raw}</span>
      </span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>
    );
  }
  if (col.key === "budget_from" || col.key === "budget_to") {
    const n = Number(raw);
    const display = isNaN(n) ? raw : n.toLocaleString();
    return (
      <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-3 py-2 block truncate" dir="ltr">{display}</span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>
    );
  }
  if (col.key === "last_contact_date") {
    let display = raw;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) display = d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" });
    return (
      <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-3 py-2 block truncate">{display}</span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>
    );
  }
  return (
    <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-3 py-2 block truncate">{raw}</span></TooltipTrigger><TooltipContent side="bottom" align="start" className="max-w-sm whitespace-pre-wrap break-words">{raw}</TooltipContent></Tooltip>
  );
});
CellDisplay.displayName = "CellDisplay";

export function ClientTable({ columns, clients, locale, creatorMap, employeeMap, userId }: ClientTableProps) {
  const t = useTranslations("Clients");
  const router = useRouter();
  const { notifyCellEdit } = useRealtime();
  const { data: liveClients, setInitialData } = useRealtimeSync<ClientRow>("clients");
  useEffect(() => { setInitialData(clients); }, [clients, setInitialData]);
  const clientsData = liveClients.length > 0 ? liveClients : clients;

  const enabledColumns = useMemo(() => columns.filter((c) => c.enabled), [columns]);

  const [localClients, setLocalClients] = useState(clientsData);
  const { containerRef, ctrlD } = useTableCellKeyboard(localClients);
  const bgSaveRef = useRef<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [localCols, setLocalCols] = useState(enabledColumns);
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ cid: string; key: string } | null>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const col of enabledColumns) init[col.key] = COL_WIDTHS[col.key] ?? DEFAULT_WIDTH;
    return init;
  });
  const colWidthsRef = useRef(colWidths); colWidthsRef.current = colWidths;

  useEffect(() => { setLocalClients(clientsData); }, [clientsData]);
  useEffect(() => { setLocalCols(enabledColumns); }, [enabledColumns]);
  useEffect(() => {
    setColWidths((prev) => {
      let changed = false; const updated = { ...prev };
      for (const col of enabledColumns) { if (!(col.key in prev)) { updated[col.key] = COL_WIDTHS[col.key] ?? DEFAULT_WIDTH; changed = true; } }
      return changed ? updated : prev;
    });
  }, [enabledColumns]);

  const handleResizeMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidthsRef.current[colKey] ?? DEFAULT_WIDTH;
    const move = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newW = Math.max(MIN_WIDTH, startWidth + delta);
      const el = document.querySelector(`col[data-col-key="${colKey}"]`) as HTMLElement | null;
      if (el) el.style.width = `${newW}px`;
    };
    const up = () => {
      document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
      document.body.style.cursor = ""; document.body.style.userSelect = "";
      const el = document.querySelector(`col[data-col-key="${colKey}"]`) as HTMLElement | null;
      if (el) { const w = parseInt(el.style.width, 10); if (!isNaN(w)) setColWidths((prev) => ({ ...prev, [colKey]: w })); }
    };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault(); if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...localCols]; const [moved] = reordered.splice(dragIdx, 1); reordered.splice(idx, 0, moved);
    setLocalCols(reordered); setDragIdx(idx);
  };
  const handleDrop = async () => {
    setDragIdx(null);
    await updateColumnOrder(localCols.map((col, i) => ({ id: col.id, sort_order: i })));
    router.refresh();
  };

  const handleDoubleClick = (col: ColumnConfig) => { setEditingCol(col.id); setEditValue(locale === "ar" ? col.label_ar : col.label_en); setTimeout(() => editRef.current?.select(), 50); };
  const handleRename = async (col: ColumnConfig) => {
    if (!editValue.trim()) return;
    await renameColumnConfig(col.id, locale === "ar" ? editValue.trim() : col.label_ar, locale === "en" ? editValue.trim() : col.label_en);
    setEditingCol(null); router.refresh();
  };
  const getLabel = (col: ColumnConfig) => {
    if (editingCol === col.id) return <input ref={editRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleRename(col)} onKeyDown={(e) => { if (e.key === "Enter") handleRename(col); if (e.key === "Escape") setEditingCol(null); }} className="w-full bg-transparent border-b border-primary px-0 py-0 text-xs font-medium outline-none" autoFocus />;
    return locale === "ar" ? col.label_ar : col.label_en;
  };

  const clientsBuiltin = useRef(new Set([
    "customer_name","phone","phone_alt","budget_from","budget_to",
    "payment_method","preferred_area","unit_type","bedrooms",
    "preferred_developer","source","additional_notes","last_contact_date",
    "assigned_employee",
  ]));

  /* -- Inline cell edit -- */
  const cellEdit = useCallback((cid: string, key: string) => setEditing({ cid, key }), []);
  const cellSave = useCallback((cid: string, key: string, value: string) => {
    setEditing(null);
    setLocalClients((prev) => prev.map((c) => {
      if (c.id !== cid) return c;
      if (clientsBuiltin.current.has(key)) return { ...c, [key]: value } as ClientRow;
      const cf = { ...(c.custom_fields as Record<string, unknown>), [key]: value.trim() || null };
      return { ...c, custom_fields: cf } as ClientRow;
    }));
    notifyCellEdit({ table: "clients", rowId: cid, field: key, action: "update" });
    const tag = cid + key;
    if (!bgSaveRef.current.has(tag)) { bgSaveRef.current.add(tag); updateClientField(cid, key, value).finally(() => bgSaveRef.current.delete(tag)); }
  }, [notifyCellEdit]);
  const editCancel = useCallback(() => setEditing(null), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key === "d") {
        ctrlD(cellSave, (rowId, colKey) => {
          const idx = localClients.findIndex((c) => c.id === rowId);
          if (idx <= 0) return null;
          const prev = localClients[idx - 1] as Record<string, unknown>;
          const val = prev[colKey];
          return (val != null && val !== "") ? String(val) : null;
        });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ctrlD, cellSave, localClients]);

  const ed = editing;

  const getCellRaw = (col: ColumnConfig, client: ClientRow) => {
    if (col.key === "created_by") return creatorMap.get(String(client[col.key] ?? "")) || String(client[col.key] ?? "");
    if (col.key === "assigned_employee") return employeeMap.get(String(client[col.key] ?? "")) || String(client[col.key] ?? "");
    return col.is_builtin ? String(client[col.key] ?? "") : String((client.custom_fields as Record<string, unknown>)?.[col.key] ?? "");
  };

  return (
    <TooltipProvider>
      <div ref={containerRef} className="overflow-x-auto rounded-lg border">
        <table className="border-collapse text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            {localCols.map((col) => <col key={col.id} data-col-key={col.key} style={{ width: colWidths[col.key] ?? COL_WIDTHS[col.key] ?? DEFAULT_WIDTH }} />)}
            <col style={{ width: ACTIONS_WIDTH }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/40">
              {localCols.map((col, idx) => (
                <th key={col.id} onDragOver={(e) => handleDragOver(e, idx)} onDrop={handleDrop} onDoubleClick={() => handleDoubleClick(col)}
                  className={`relative select-none border-b border-r px-1.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap ${dragIdx === idx ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-1 pr-3" draggable onDragStart={() => handleDragStart(idx)}>
                    <span className="flex-1">{getLabel(col)}</span>
                  </div>
                  <div draggable={false} className="absolute bottom-0 top-0 z-10 -right-px w-2 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors"
                    onMouseDown={(e) => handleResizeMouseDown(e, col.key)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderRight = "2px solid var(--primary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderRight = "2px solid transparent"; }} />
                </th>
              ))}
              <th className="border-b px-3 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {clientsData.length === 0 ? (
              <tr><td colSpan={localCols.length + 1} className="px-3 py-12 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-8 w-8 opacity-50" />{t("empty")}</td></tr>
            ) : (
              localClients.map((client) => (
                <tr key={client.id} className="border-b last:border-0 hover:bg-muted/30">
                  {localCols.map((col) => {
                    const key = col.key;
                    const isEdit = ed?.cid === client.id && ed?.key === key;
                    const raw = getCellRaw(col, client);
                    return (
                      <PresenceTd key={col.id} table="clients" rowId={client.id as string} colKey={key} className="overflow-hidden border-b border-r align-middle">
                        {isEdit ? (
                          <CellEditor
                            defaultValue={key === "last_contact_date" ? String(client[key] ?? "") : raw}
                            type={key === "budget_from" || key === "budget_to" ? "number" : key === "last_contact_date" ? "date" : "text"}
                            onSave={(v) => cellSave(client.id as string, key, v)}
                            onCancel={editCancel}
                          />
                        ) : (
                          <CellDisplay col={col} raw={raw} locale={locale} onEdit={() => cellEdit(client.id as string, key)} />
                        )}
                      </PresenceTd>
                    );
                  })}
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/clients/${client.id}`}><Button variant="outline" size="sm">{t("clientDetails")}</Button></Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
