"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Users } from "lucide-react";
import { updateColumnOrder, renameColumnConfig, type ColumnConfig } from "@/lib/client-config-actions";
import { PresenceTd } from "@/components/realtime/presence-td";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

type ClientRow = Record<string, unknown> & {
  id: string;
  custom_fields: Record<string, unknown>;
};

const COL_WIDTHS: Record<string, number> = {
  customer_name: 160,
  phone: 140,
  phone_alt: 140,
  budget_from: 130,
  budget_to: 130,
  payment_method: 120,
  preferred_area: 140,
  unit_type: 120,
  bedrooms: 100,
  preferred_developer: 150,
  source: 130,
  additional_notes: 180,
  last_contact_date: 130,
  assigned_employee: 150,
  created_by: 140,
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

export function ClientTable({ columns, clients, locale, creatorMap, employeeMap, userId }: ClientTableProps) {
  const t = useTranslations("Clients");
  const router = useRouter();

  const { data: liveClients, setInitialData } = useRealtimeSync<ClientRow>("clients");

  useEffect(() => {
    setInitialData(clients);
  }, [clients, setInitialData]);

  const clientsData = liveClients.length > 0 ? liveClients : clients;

  const enabledColumns = useMemo(() => columns.filter((c) => c.enabled), [columns]);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [localCols, setLocalCols] = useState(enabledColumns);
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const col of enabledColumns) init[col.key] = COL_WIDTHS[col.key] ?? DEFAULT_WIDTH;
    return init;
  });
  const colWidthsRef = useRef(colWidths);
  colWidthsRef.current = colWidths;

  useEffect(() => { setLocalCols(enabledColumns); }, [enabledColumns]);
  useEffect(() => {
    setColWidths((prev) => {
      let changed = false;
      const updated = { ...prev };
      for (const col of enabledColumns) {
        if (!(col.key in prev)) { updated[col.key] = COL_WIDTHS[col.key] ?? DEFAULT_WIDTH; changed = true; }
      }
      return changed ? updated : prev;
    });
  }, [enabledColumns]);

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
      return <input ref={editRef} type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleRename(col)} onKeyDown={(e) => { if (e.key === "Enter") handleRename(col); if (e.key === "Escape") setEditingCol(null); }} className="w-full bg-transparent border-b border-primary px-0 py-0 text-xs font-medium outline-none" autoFocus />;
    }
    return locale === "ar" ? col.label_ar : col.label_en;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const renderCell = (col: ColumnConfig, client: ClientRow) => {
    const raw = col.is_builtin ? String(client[col.key] ?? "") : String((client.custom_fields as Record<string, unknown>)?.[col.key] ?? "");
    if (!raw) return "";
    if (col.key === "budget_from") return <span dir="ltr">{Number(raw).toLocaleString()}{client.budget_to ? ` - ${Number(client.budget_to).toLocaleString()}` : ""}</span>;
    if (col.key === "budget_to") return <span dir="ltr">{Number(raw).toLocaleString()}</span>;
    if (col.key === "created_by") return creatorMap.get(raw) || raw;
    if (col.key === "assigned_employee") return employeeMap.get(raw) || raw;
    if (col.key === "last_contact_date") return formatDate(raw);
    return raw;
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="border-collapse text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
        <colgroup>
          {localCols.map((col) => (
            <col key={col.id} data-col-key={col.key} style={{ width: colWidths[col.key] ?? COL_WIDTHS[col.key] ?? DEFAULT_WIDTH }} />
          ))}
          <col style={{ width: ACTIONS_WIDTH }} />
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
                <div className="flex items-center gap-1 pr-3" draggable onDragStart={() => handleDragStart(idx)}>
                  <span className="flex-1">{getLabel(col)}</span>
                </div>
                <div
                  draggable={false}
                  className="absolute bottom-0 top-0 z-10 -right-px w-2 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors"
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
          {clientsData.length === 0 ? (
            <tr>
              <td colSpan={localCols.length + 1} className="px-3 py-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                {t("empty")}
              </td>
            </tr>
          ) : (
            clientsData.map((client) => (
              <tr key={client.id} className="border-b last:border-0 hover:bg-muted/30">
                {localCols.map((col) => (
                  <PresenceTd key={col.id} table="clients" rowId={client.id as string} colKey={col.key} className="overflow-hidden border-r px-3 py-2 truncate">
                    {renderCell(col, client)}
                  </PresenceTd>
                ))}
                <td className="whitespace-nowrap px-3 py-2">
                  <Link href={`/clients/${client.id}`}>
                    <Button variant="outline" size="sm">{t("clientDetails")}</Button>
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
