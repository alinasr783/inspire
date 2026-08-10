"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Users, Eye, Pencil, Trash2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { updateColumnOrder, renameColumnConfig, type ColumnConfig } from "@/lib/client-config-actions";
import { updateClientField, quickCreateClient, deleteClient } from "@/lib/client-actions";
import { useRealtime } from "@/components/providers/realtime-provider";
import { PresenceTd } from "@/components/realtime/presence-td";
import { TableCellContextMenu, type CellInfo } from "@/components/realtime/table-cell-context-menu";
import { useTableCellKeyboard } from "@/hooks/use-table-cell-keyboard";
import { useCellStyles } from "@/hooks/use-cell-styles";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { showSuccess, showError } from "@/lib/toast-utils";

type ClientRow = Record<string, unknown> & { id: string; custom_fields: Record<string, unknown> };

const STALE_DAYS = 7;

function isStaleContact(client: ClientRow): boolean {
  const raw = client.last_contact_date;
  if (!raw) return false;
  const date = new Date(String(raw));
  if (isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > STALE_DAYS * 24 * 60 * 60 * 1000;
}

const COL_WIDTHS: Record<string, number> = {
  customer_name: 160, phone: 140, phone_alt: 140, budget_from: 130, budget_to: 130,
  payment_method: 120, preferred_area: 140, unit_type: 120, bedrooms: 100,
  preferred_developer: 150, source: 130, additional_notes: 180, last_contact_date: 130,
  assigned_employee: 150, created_by: 140, seriousness_rating: 120,
};
const DEFAULT_WIDTH = 150;
const MIN_WIDTH = 50;
const ACTIONS_WIDTH = 130;

const IS_BROWSER = typeof window !== "undefined";

function loadColWidths(uid: string, defaults: Record<string, number>) {
  if (!IS_BROWSER) return defaults;
  try {
    const raw = localStorage.getItem(`inspire_cw_clients_${uid}`);
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, number>;
      const merged = { ...defaults };
      for (const [k, v] of Object.entries(saved)) { if (typeof v === "number" && v >= 50) merged[k] = v; }
      return merged;
    }
  } catch {}
  return defaults;
}

function saveColWidths(uid: string, widths: Record<string, number>) {
  if (!IS_BROWSER) return;
  try { localStorage.setItem(`inspire_cw_clients_${uid}`, JSON.stringify(widths)); } catch {}
}

interface ClientTableProps {
  columns: ColumnConfig[];
  clients: ClientRow[];
  locale: string;
  creatorMap: Map<string, string>;
  employeeMap: Map<string, string>;
  userId: string;
}

const DROPDOWN_OPTIONS: Record<string, string[]> = {
  payment_method: ["كاش", "تقسيط", "Cash", "Installment"],
  unit_type: ["شقة", "فيلا", "دوبلكس", "مكتب", "أرض", "تجاري", "Apartment", "Villa", "Duplex", "Office", "Land", "Commercial"],
  source: ["Road", "Facebook", "Instagram", "TikTok", "معرض", "فيس", "انستجرام", "تيك توك"],
  bedrooms: ["1", "2", "3", "4", "5", "6"],
  preferred_area: [],
  preferred_developer: [],
};

/* -- Cell Editor -- */
const CellEditor = memo(({ defaultValue, type, options, colKey, onSave, onCancel }: { defaultValue: string; type: string; options?: { value: string; label: string }[]; colKey?: string; onSave: (v: string) => void; onCancel: () => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.focus(); el.select(); } }, []);

  const commit = useCallback(() => onSave(ref.current?.value ?? ""), [onSave]);
  const keyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") onCancel(); }, [commit, onCancel]);

  if (options && options.length > 0) {
    const listId = `datalist-${colKey || "editor"}`;
    return (
      <>
        <input ref={ref} list={listId} type="text" defaultValue={defaultValue} onBlur={commit} onKeyDown={keyDown}
          className="block h-full w-full border-none bg-transparent px-0 py-0 text-xs outline-none" />
        <datalist id={listId}>
          {options.map((o) => <option key={o.value} value={o.value} />)}
        </datalist>
      </>
    );
  }

  return <input ref={ref} type={type === "date" ? "date" : type === "number" ? "number" : "text"} defaultValue={defaultValue} onBlur={commit} onKeyDown={keyDown} className="block h-full w-full border-none bg-transparent px-0 py-0 text-xs outline-none" />;
});
CellEditor.displayName = "CellEditor";

/* -- Cell Display -- */
const CellDisplay = memo(({ col, raw, locale, onEdit }: { col: ColumnConfig; raw: string; locale: string; onEdit: () => void }) => {
  if (!raw) return <span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block truncate min-h-[1.25rem]">&nbsp;</span>;

  if (col.key === "payment_method") {
    return <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block truncate"><span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">{raw}</span></span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>;
  }
  if (col.key === "unit_type") {
    return <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block truncate"><span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-200">{raw}</span></span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>;
  }
  if (col.key === "source") {
    return <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block truncate"><span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">{raw}</span></span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>;
  }
  if (col.key === "bedrooms") {
    return <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block truncate"><span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800/40 dark:text-gray-200">{raw}</span></span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>;
  }
  if (col.key === "budget_from" || col.key === "budget_to") {
    const n = Number(raw); const display = isNaN(n) ? raw : n.toLocaleString();
    return <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block truncate" dir="ltr">{display}</span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>;
  }
  if (col.key === "last_contact_date") {
    let display = raw; const d = new Date(raw);
    if (!isNaN(d.getTime())) display = d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" });
    return <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block truncate">{display}</span></TooltipTrigger><TooltipContent side="bottom" align="start">{raw}</TooltipContent></Tooltip>;
  }
  if (col.key === "seriousness_rating") {
    const n = Number(raw);
    const colorClass = isNaN(n) ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
      : n <= 3 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      : n <= 5 ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
      : n <= 7 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
      : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
    const filled = isNaN(n) ? 0 : Math.min(10, Math.max(0, Math.round(n)));
    const stars = "★".repeat(filled) + "☆".repeat(10 - filled);
    return (
      <Tooltip>
        <TooltipTrigger>
          <span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
              <span className="text-[11px] leading-none">{stars}</span>
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">{raw}/10</TooltipContent>
      </Tooltip>
    );
  }
  return <Tooltip><TooltipTrigger><span onClick={onEdit} className="cursor-pointer hover:bg-muted/50 px-0 py-0 block truncate">{raw}</span></TooltipTrigger><TooltipContent side="bottom" align="start" className="max-w-sm whitespace-pre-wrap break-words">{raw}</TooltipContent></Tooltip>;
});
CellDisplay.displayName = "CellDisplay";

/* -- Memoized Table Row -- */
interface TableRowProps {
  client: ClientRow;
  index: number;
  localCols: ColumnConfig[];
  stale: boolean;
  editing: { cid: string; key: string } | null;
  getCellRaw: (col: ColumnConfig, client: ClientRow) => string;
  getEditOptions: (col: ColumnConfig) => { value: string; label: string }[] | undefined;
  getEditType: (col: ColumnConfig) => string;
  cellEdit: (cid: string, key: string) => void;
  cellSave: (cid: string, key: string, value: string) => void;
  editCancel: () => void;
  onContextMenu: (e: React.MouseEvent, info: CellInfo) => void;
  onDelete: (cid: string) => void;
  clientsData: ClientRow[];
  locale: string;
  isSelected: boolean;
  onRowMouseEnter: (uid: string) => void;
}

const TableRowComponent = memo(function TableRowComponent({
  client, index, localCols, stale, editing,
  getCellRaw, getEditOptions, getEditType,
  cellEdit, cellSave, editCancel, onContextMenu, onDelete,
  clientsData, locale, isSelected, onRowMouseEnter,
}: TableRowProps) {
  const ed = editing;

  return (
    <tr
      className={`border-b last:border-0 hover:bg-muted/30 ${stale ? "inspire-stale-contact" : ""} ${isSelected ? "bg-primary/10 dark:bg-muted/40" : ""} scroll-mt-10`}
      data-row-id={client.id as string}
      data-seriousness={String(client.seriousness_rating ?? "")}
      onMouseEnter={() => onRowMouseEnter(client.id as string)}
    >
      <td className="border-b border-r px-2 py-2 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</td>
      {localCols.map((col) => {
        const key = col.key;
        const isEdit = ed?.cid === client.id && ed?.key === key;
        const raw = getCellRaw(col, client);
        const editOptions = getEditOptions(col);
        return (
          <PresenceTd key={col.id} table="clients" rowId={client.id as string} colKey={key} className="overflow-hidden border-b border-r align-middle" onContextMenu={onContextMenu}>
            {isEdit ? (
              <CellEditor defaultValue={key === "assigned_employee" ? String(client[key] ?? "") : raw}
                type={getEditType(col)} options={editOptions} colKey={key}
                onSave={(v) => cellSave(client.id as string, key, v)} onCancel={editCancel} />
            ) : (
              <CellDisplay col={col} raw={raw} locale={locale} onEdit={() => cellEdit(client.id as string, key)} />
            )}
          </PresenceTd>
        );
      })}
      <td className="whitespace-nowrap px-2 py-2">
        <div className="flex items-center gap-0.5">
          <Link href={`/clients/${client.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"><Eye className="h-4 w-4" /></Link>
          <Link href={`/clients/${client.id}/edit`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></Link>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-red-50 text-red-500 hover:text-red-600" onClick={() => onDelete(client.id as string)}><Trash2 className="h-4 w-4" /></button>
        </div>
      </td>
    </tr>
  );
});

export function ClientTable({ columns, clients, locale, creatorMap, employeeMap, userId }: ClientTableProps) {
  const t = useTranslations("Clients");
  const router = useRouter();
  const { notifyCellEdit } = useRealtime();

  const { data: liveClients, setInitialData } = useRealtimeSync<ClientRow>("clients");
  useEffect(() => { setInitialData(clients); }, [clients, setInitialData]);
  useCellStyles("clients");
  const clientsData = liveClients.length > 0 ? liveClients : clients;

  const enabledColumns = useMemo(() => columns.filter((c) => c.enabled), [columns]);
  const [localCols, setLocalCols] = useState(enabledColumns);

  useEffect(() => { setLocalCols(enabledColumns); }, [enabledColumns]);

  useEffect(() => {
    if (!IS_BROWSER || enabledColumns.length === 0) return;
    const saved = localStorage.getItem("inspire_cw_clients_order");
    if (saved) {
      try {
        const ids = JSON.parse(saved) as string[];
        const reordered = ids.map((id) => enabledColumns.find((c) => c.id === id)).filter(Boolean) as ColumnConfig[];
        if (reordered.length === enabledColumns.length) setLocalCols(reordered);
      } catch {}
    }
  }, [enabledColumns]);

  const [localClients, setLocalClients] = useState(clientsData);
  const { containerRef, ctrlD } = useTableCellKeyboard(localClients);
  const bgSaveRef = useRef<Set<string>>(new Set());
  const localClientsRef = useRef(localClients); localClientsRef.current = localClients;
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const selectedRowRef = useRef<string | null>(null);

  useEffect(() => {
    if (localClients.length > 0) {
      const exists = selectedRowRef.current && localClients.find((c) => c.id === selectedRowRef.current);
      if (!exists) {
        const firstId = localClients[0].id as string;
        selectedRowRef.current = firstId;
        setSelectedRowId(firstId);
      }
    }
  }, [localClients]);

  const handleRowMouseEnter = useCallback((uid: string) => {
    selectedRowRef.current = uid;
    setSelectedRowId(uid);
  }, []);

  useEffect(() => {
    function onArrow(e: KeyboardEvent) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const rows = localClientsRef.current;
      if (rows.length === 0) return;
      e.preventDefault();
      const current = selectedRowRef.current;
      const idx = current ? rows.findIndex((c) => c.id === current) : -1;
      const nextIdx = e.key === "ArrowUp"
        ? Math.max(0, idx <= 0 ? 0 : idx - 1)
        : Math.min(rows.length - 1, idx < 0 ? 0 : idx + 1);
      const nextId = rows[nextIdx]?.id as string | undefined;
      if (!nextId) return;
      selectedRowRef.current = nextId;
      setSelectedRowId(nextId);
      const el = document.querySelector(`tr[data-row-id="${nextId}"]`);
      if (el) el.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
    document.addEventListener("keydown", onArrow);
    return () => document.removeEventListener("keydown", onArrow);
  }, []);
  const dragIdxRef = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ cid: string; key: string } | null>(null);
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
      if (e.key === "r" || e.key === "R") { e.preventDefault(); setCtxMenu({ info: { table: "clients", rowId: h.rowId, colKey: h.colKey, colLabel: h.colKey, rowData: null }, pos: { x: h.x, y: h.y }, shortcut: { scope: "row", target: "color_bg" } }); }
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setCtxMenu({ info: { table: "clients", rowId: h.rowId, colKey: h.colKey, colLabel: h.colKey, rowData: null }, pos: { x: h.x, y: h.y }, shortcut: { scope: "column", target: "color_bg" } }); }
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("keydown", onKeyDown); };
  }, [ctxMenu]);

  const [deleteDialog, setDeleteDialog] = useState<{ cid: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openDelete = useCallback((cid: string) => {
    const c = clientsData.find((x) => x.id === cid);
    setDeleteDialog({ cid, name: (c as any)?.customer_name || cid.slice(0, 8) });
  }, [clientsData]);

  const confirmDelete = useCallback(async () => {
    if (!deleteDialog) return;
    const cid = deleteDialog.cid;
    setDeleting(true);
    try { await deleteClient(cid); setLocalClients((prev) => prev.filter((c) => c.id !== cid)); showSuccess("Client deleted"); } catch (e: any) { showError(e?.message || "Delete failed"); }
    setDeleting(false);
    setDeleteDialog(null);
  }, [deleteDialog]);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    for (const col of enabledColumns) defaults[col.key] = COL_WIDTHS[col.key] ?? DEFAULT_WIDTH;
    return loadColWidths(userId, defaults);
  });
  const colWidthsRef = useRef(colWidths); colWidthsRef.current = colWidths;

  useEffect(() => { setLocalClients(clientsData); }, [clientsData]);
  useEffect(() => { saveColWidths(userId, colWidths); }, [colWidths, userId]);
  useEffect(() => {
    setColWidths((prev) => {
      let changed = false; const updated = { ...prev };
      for (const col of enabledColumns) { if (!(col.key in prev)) { updated[col.key] = COL_WIDTHS[col.key] ?? DEFAULT_WIDTH; changed = true; } }
      return changed ? updated : prev;
    });
  }, [enabledColumns]);

  useEffect(() => {
    function onTableReset(e: Event) {
      const detail = (e as CustomEvent<{ table: string }>).detail;
      if (!detail || detail.table !== "clients") return;
      if (IS_BROWSER) localStorage.removeItem(`inspire_cw_clients_${userId}`);
      const defaults: Record<string, number> = {};
      for (const col of enabledColumns) defaults[col.key] = COL_WIDTHS[col.key] ?? DEFAULT_WIDTH;
      setColWidths(defaults);
    }
    window.addEventListener("inspire:table-reset", onTableReset);
    return () => window.removeEventListener("inspire:table-reset", onTableReset);
  }, [enabledColumns, userId]);

  const handleResizeMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX; const startWidth = colWidthsRef.current[colKey] ?? DEFAULT_WIDTH;
    const move = (ev: MouseEvent) => { const delta = ev.clientX - startX; const newW = Math.max(MIN_WIDTH, startWidth + delta); const el = document.querySelector(`col[data-col-key="${colKey}"]`) as HTMLElement | null; if (el) el.style.width = `${newW}px`; };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.cursor = ""; document.body.style.userSelect = ""; const el = document.querySelector(`col[data-col-key="${colKey}"]`) as HTMLElement | null; if (el) { const w = parseInt(el.style.width, 10); if (!isNaN(w)) setColWidths((prev) => ({ ...prev, [colKey]: w })); } };
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  };

  // Optimized drag: use ref for dragIdx during drag, only update state on drop
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
    if (IS_BROWSER) localStorage.setItem("inspire_cw_clients_order", JSON.stringify(finalCols.map((c) => c.id)));
    router.refresh();
  }, [localCols, router]);

  const handleDoubleClick = (col: ColumnConfig) => { setEditingCol(col.id); setEditValue(locale === "ar" ? col.label_ar : col.label_en); setTimeout(() => editRef.current?.select(), 50); };
  const handleRename = async (col: ColumnConfig) => { if (!editValue.trim()) return; await renameColumnConfig(col.id, locale === "ar" ? editValue.trim() : col.label_ar, locale === "en" ? editValue.trim() : col.label_en); setEditingCol(null); router.refresh(); };
  const getLabel = (col: ColumnConfig) => editingCol === col.id ? <input ref={editRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleRename(col)} onKeyDown={(e) => { if (e.key === "Enter") handleRename(col); if (e.key === "Escape") setEditingCol(null); }} className="w-full bg-transparent border-b border-primary px-0 py-0 text-xs font-medium outline-none" autoFocus /> : locale === "ar" ? col.label_ar : col.label_en;

  const clientsBuiltin = useRef(new Set([
    "customer_name","phone","phone_alt","budget_from","budget_to","payment_method","preferred_area",
    "unit_type","bedrooms","preferred_developer","source","additional_notes","last_contact_date","assigned_employee",
    "seriousness_rating",
  ]));

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
          const val = prev[colKey]; return (val != null && val !== "") ? String(val) : null;
        });
      }
      if (e.altKey && e.key === "n") {
        e.preventDefault();
        quickCreateClient(userId).then((newClient) => {
          setLocalClients((prev) => [newClient, ...prev]);
        }).catch(() => {});
      }
    }
    document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey);
  }, [ctrlD, cellSave, localClients]);

  // Memoized helpers to avoid recreating closures per render
  const getCellRaw = useCallback((col: ColumnConfig, client: ClientRow) => {
    if (col.key === "created_by") return creatorMap.get(String(client[col.key] ?? "")) || String(client[col.key] ?? "");
    if (col.key === "assigned_employee") return employeeMap.get(String(client[col.key] ?? "")) || String(client[col.key] ?? "");
    return col.is_builtin ? String(client[col.key] ?? "") : String((client.custom_fields as Record<string, unknown>)?.[col.key] ?? "");
  }, [creatorMap, employeeMap]);

  const getEditOptions = useCallback((col: ColumnConfig): { value: string; label: string }[] | undefined => {
    if (col.key === "assigned_employee") return Array.from(employeeMap.entries()).map(([id, name]) => ({ value: id, label: name }));
    const opts = DROPDOWN_OPTIONS[col.key];
    if (opts && opts.length > 0) return opts.map((o) => ({ value: o, label: o }));
    if (col.type === "select" && col.options && col.options.length > 0) return col.options.map((o) => ({ value: o, label: o }));
    return undefined;
  }, [employeeMap]);

  const getEditType = useCallback((col: ColumnConfig): string => {
    if (col.key === "assigned_employee") return "select";
    if (col.key === "budget_from" || col.key === "budget_to") return "number";
    if (col.key === "last_contact_date" || col.type === "date") return "date";
    return "text";
  }, []);

  // Pre-compute stale status for all clients
  const staleMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const c of localClients) map.set(c.id as string, isStaleContact(c));
    return map;
  }, [localClients]);

  return (
    <TooltipProvider>
      <div ref={containerRef} className="overflow-x-auto">
        <table className="border-collapse text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: 60 }} />
            {localCols.map((col) => <col key={col.id} data-col-key={col.key} style={{ width: colWidths[col.key] ?? COL_WIDTHS[col.key] ?? DEFAULT_WIDTH }} />)}
            <col style={{ width: ACTIONS_WIDTH }} />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/95 backdrop-blur-sm">
              <th className="border-b border-r px-2 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">{t("id")}</th>
              {localCols.map((col, idx) => (
                <th key={col.id} data-col-key={col.key} onDragOver={(e) => handleDragOver(e, idx)} onDrop={handleDrop} onDoubleClick={() => handleDoubleClick(col)}
                  className={`relative select-none border-b border-r px-1.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap ${dragIdx === idx ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-1 pr-3" draggable onDragStart={() => handleDragStart(idx)}><span className="flex-1">{getLabel(col)}</span></div>
                  <div draggable={false} className="absolute bottom-0 top-0 z-10 -right-px w-2 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors" onMouseDown={(e) => handleResizeMouseDown(e, col.key)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderRight = "2px solid var(--primary)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderRight = "2px solid transparent"; }} />
                </th>
              ))}
              <th className="border-b px-3 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {clientsData.length === 0 ? (
              <tr><td colSpan={localCols.length + 2} className="px-3 py-12 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-8 w-8 opacity-50" />{t("empty")}</td></tr>
            ) : (
              localClients.map((client, index) => (
                <TableRowComponent
                  key={client.id}
                  client={client}
                  index={index}
                  localCols={localCols}
                  stale={staleMap.get(client.id as string) ?? false}
                  editing={editing}
                  getCellRaw={getCellRaw}
                  getEditOptions={getEditOptions}
                  getEditType={getEditType}
                  cellEdit={cellEdit}
                  cellSave={cellSave}
                  editCancel={editCancel}
                  onContextMenu={handleContextMenu}
                  onDelete={openDelete}
                  clientsData={clientsData}
                  locale={locale}
                  isSelected={selectedRowId === client.id}
                  onRowMouseEnter={handleRowMouseEnter}
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
