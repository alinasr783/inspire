"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Eye, Pencil, Trash2, Calendar } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { updateVisitField, deleteVisit, type VisitStatus } from "@/lib/visit-actions";
import { useRealtime } from "@/components/providers/realtime-provider";
import { TableCellContextMenu, type CellInfo } from "@/components/realtime/table-cell-context-menu";
import { useTableCellKeyboard } from "@/hooks/use-table-cell-keyboard";
import { useCellStyles } from "@/hooks/use-cell-styles";
import { PostVisitNotesDialog } from "@/components/visits/post-visit-notes-dialog";

export type VisitTableRow = {
  id: string;
  client_id: string;
  unit_id: string;
  client_name: string;
  client_phone: string;
  unit_name: string;
  unit_phone: string;
  compound_name: string;
  building_number: string;
  apartment_number: string;
  visit_date: string;
  status: VisitStatus;
  notes: string;
  post_visit_notes: string;
  created_by: string;
  assigned_to: string | null;
  creator_name: string;
  assignee_name: string;
};

const COLUMN_WIDTHS: Record<string, number> = {
  client_name: 160, unit_name: 160, compound_name: 150, building_number: 110,
  apartment_number: 110, visit_date: 160, status: 120, notes: 200,
  post_visit_notes: 200, creator_name: 130,
};
const DEFAULT_COL_WIDTH = 150;
const MIN_COL_WIDTH = 60;
const ACTIONS_COL_WIDTH = 120;

const COLUMNS_ORDER = [
  "client_name", "unit_name", "compound_name", "building_number",
  "apartment_number", "visit_date", "status", "notes", "post_visit_notes", "creator_name",
];

const EDITABLE_FIELDS = new Set([
  "compound_name", "building_number", "apartment_number",
  "visit_date", "notes", "post_visit_notes",
]);

const STATUS_OPTIONS = [
  { value: "upcoming", label: "upcoming" },
  { value: "completed", label: "completed" },
  { value: "cancelled", label: "cancelled" },
];

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function toDateValue(iso: string): string {
  if (!iso) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso)) return iso.slice(0, 16);
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16);
  } catch { return iso; }
}

const CellDisplay = memo(({ raw, onEdit, className }: {
  raw: string; onEdit: () => void; className?: string;
}) => (
  <span onClick={onEdit} className={`block h-full w-full cursor-pointer truncate px-2.5 py-2 text-[13px] hover:bg-muted/50 ${className ?? ""}`}>
    {raw || <span className="text-muted-foreground/50 italic">—</span>}
  </span>
));
CellDisplay.displayName = "CellDisplay";

const CellEditor = memo(({ defaultValue, type, options, onSave, onCancel }: {
  defaultValue: string; type: string; options?: { value: string; label: string }[];
  onSave: (v: string) => void; onCancel: () => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.focus(); el.select(); }
    const sel = selectRef.current;
    if (sel) sel.focus();
  }, []);

  const commit = useCallback((forcedVal?: string) => {
    const val = forcedVal ?? ref.current?.value ?? selectRef.current?.value ?? "";
    onSave(val);
  }, [onSave]);

  const keyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") onCancel();
  }, [commit, onCancel]);

  if (options?.length) {
    return (
      <select
        ref={selectRef}
        defaultValue={defaultValue}
        onBlur={() => commit()}
        onChange={(e) => commit(e.target.value)}
        className="block h-full w-full border-none bg-transparent px-2.5 py-2 text-[13px] outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={ref}
      type={type}
      defaultValue={defaultValue}
      onBlur={() => commit()}
      onKeyDown={keyDown}
      className="block h-full w-full border-none bg-transparent px-2.5 py-2 text-[13px] outline-none"
    />
  );
});
CellEditor.displayName = "CellEditor";

interface VisitTableProps {
  visits: VisitTableRow[];
  locale: string;
  isAdmin: boolean;
  userId: string;
}

export function VisitTable({ visits: serverVisits, locale, isAdmin, userId }: VisitTableProps) {
  const t = useTranslations("Visits");
  const router = useRouter();
  const { notifyCellEdit } = useRealtime();
  const [localVisits, setLocalVisits] = useState(serverVisits);
  const { containerRef, ctrlD } = useTableCellKeyboard(localVisits);
  useCellStyles("visits");

  const [editing, setEditing] = useState<{ uid: string; colKey: string } | null>(null);
  const cellEdit = useCallback((uid: string, colKey: string) => setEditing({ uid, colKey }), []);
  const editCancel = useCallback(() => setEditing(null), []);

  const [ctxMenu, setCtxMenu] = useState<{ info: CellInfo; pos: { x: number; y: number } } | null>(null);
  const handleContextMenu = useCallback((e: React.MouseEvent, info: CellInfo) => {
    e.preventDefault();
    setCtxMenu({ info, pos: { x: e.clientX, y: e.clientY } });
  }, []);

  const [deleteDialog, setDeleteDialog] = useState<{ uid: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [postVisitNotes, setPostVisitNotes] = useState<{ uid: string; currentNotes: string } | null>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const key of COLUMNS_ORDER) initial[key] = COLUMN_WIDTHS[key] ?? DEFAULT_COL_WIDTH;
    return initial;
  });
  const colWidthsRef = useRef(colWidths);
  colWidthsRef.current = colWidths;

  useEffect(() => { setLocalVisits(serverVisits); }, [serverVisits]);

  const handleResizeMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidthsRef.current[colKey] ?? DEFAULT_COL_WIDTH;
    const move = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const newW = Math.max(MIN_COL_WIDTH, startWidth + delta);
      const el = document.querySelector(`col[data-col-key="${colKey}"]`) as HTMLElement | null;
      if (el) el.style.width = `${newW}px`;
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const final = Math.max(MIN_COL_WIDTH, startWidth + (document.body.style.cursor === "col-resize" ? 0 : 0));
      setColWidths((prev) => {
        const width = colWidthsRef.current[colKey] ?? DEFAULT_COL_WIDTH;
        return { ...prev, [colKey]: width };
      });
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  const bgSaveRef = useRef<Set<string>>(new Set());

  const cellSave = useCallback((uid: string, key: string, value: string) => {
    setEditing(null);
    setLocalVisits((prev) => prev.map((v) => {
      if (v.id !== uid) return v;
      return { ...v, [key]: value } as VisitTableRow;
    }));
    notifyCellEdit({ table: "visits", rowId: uid, field: key, action: "update" });
    const tag = uid + key;
    if (!bgSaveRef.current.has(tag)) {
      bgSaveRef.current.add(tag);
      updateVisitField(uid, key, value).finally(() => bgSaveRef.current.delete(tag));
    }
  }, [notifyCellEdit]);

  const handleStatusChange = useCallback((uid: string, newStatus: string) => {
    if (newStatus === "completed") {
      const visit = localVisits.find((v) => v.id === uid);
      setPostVisitNotes({ uid, currentNotes: visit?.post_visit_notes ?? "" });
    }
    cellSave(uid, "status", newStatus);
  }, [cellSave, localVisits]);

  const handlePostVisitNotesSave = useCallback(async (uid: string, notes: string) => {
    await updateVisitField(uid, "post_visit_notes", notes);
    setLocalVisits((prev) => prev.map((v) => v.id === uid ? { ...v, post_visit_notes: notes } : v));
    setPostVisitNotes(null);
    router.refresh();
  }, [router]);

  const handleDelete = useCallback(async (uid: string) => {
    const visit = localVisits.find((v) => v.id === uid);
    setDeleteDialog({ uid, name: visit?.client_name ?? uid.slice(0, 8) });
  }, [localVisits]);

  const confirmDelete = useCallback(async () => {
    if (!deleteDialog) return;
    const uid = deleteDialog.uid;
    setDeleting(true);
    setLocalVisits((prev) => prev.filter((v) => v.id !== uid));
    const result = await deleteVisit(uid);
    if (result.success) {
      router.refresh();
      toast.success(t("deleteSuccess"));
    } else {
      setLocalVisits(serverVisits);
      toast.error(t(`errors.${result.error}`));
    }
    setDeleting(false);
    setDeleteDialog(null);
  }, [deleteDialog, router, serverVisits, t]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key === "d") {
        ctrlD(cellSave, (rowId, colKey) => {
          const idx = localVisits.findIndex((v) => v.id === rowId);
          if (idx <= 0) return null;
          const prev = localVisits[idx - 1] as Record<string, unknown>;
          const val = prev[colKey];
          return (val != null && val !== "") ? String(val) : null;
        });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ctrlD, cellSave, localVisits]);

  const getCellInfo = useCallback((colKey: string, visit: VisitTableRow) => {
    const raw = String((visit as Record<string, unknown>)[colKey] ?? "");
    const canEdit = isAdmin || visit.created_by === userId;

    let options: { value: string; label: string }[] | undefined;
    if (colKey === "status") {
      options = STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(`status_${o.value}`) }));
    }

    const editType = colKey === "visit_date" ? "datetime-local" : "text";
    const cellValue = colKey === "visit_date" ? toDateValue(raw) : raw;
    const displayValue = colKey === "visit_date" ? formatDate(raw) : raw;

    return { raw: displayValue, editValue: cellValue, cellValue, options, editType, canEdit };
  }, [isAdmin, userId, t]);

  return (
    <TooltipProvider>
      <div ref={containerRef} className="overflow-x-auto rounded-lg border border-border">
        <table className="border-collapse text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            <col style={{ width: 50 }} />
            {COLUMNS_ORDER.map((key) => (
              <col key={key} data-col-key={key} style={{ width: colWidths[key] ?? DEFAULT_COL_WIDTH }} />
            ))}
            <col style={{ width: ACTIONS_COL_WIDTH }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/40">
              <th className="border-b border-r px-2.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap text-muted-foreground">#</th>
              {COLUMNS_ORDER.map((key) => (
                <th key={key} data-col-key={key} className="relative select-none border-b border-r px-1.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap text-muted-foreground">
                  <span className="px-1">{t(key)}</span>
                  <div
                    draggable={false}
                    className="absolute bottom-0 top-0 z-10 -right-px w-2 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors"
                    style={{ borderRight: "2px solid transparent" }}
                    onMouseDown={(e) => handleResizeMouseDown(e, key)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderRightColor = "var(--primary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderRightColor = "transparent"; }}
                  />
                </th>
              ))}
              <th className="border-b px-3 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap text-muted-foreground">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {localVisits.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS_ORDER.length + 2} className="px-3 py-12 text-center text-muted-foreground">
                  <Calendar className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  {t("empty")}
                </td>
              </tr>
            ) : (
              localVisits.map((visit, index) => {
                const isEditing = editing;
                const canEdit = isAdmin || visit.created_by === userId;
                return (
                  <tr
                    key={visit.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    data-row-id={visit.id}
                  >
                    <td className="border-b border-r px-2.5 py-2 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</td>
                    {COLUMNS_ORDER.map((colKey) => {
                      const isEdit = isEditing?.uid === visit.id && isEditing?.colKey === colKey;
                      const info = getCellInfo(colKey, visit);

                      return (
                        <td
                          key={colKey}
                          data-row-id={visit.id}
                          data-col-key={colKey}
                          className="overflow-hidden border-b border-r p-0 align-middle"
                          onContextMenu={(e) => {
                            if (canEdit) handleContextMenu(e, { table: "visits", rowId: visit.id, colKey, colLabel: colKey, rowData: null });
                          }}
                        >
                          {isEdit ? (
                            <CellEditor
                              defaultValue={info.cellValue}
                              type={info.editType}
                              options={info.options}
                              onSave={(v) => {
                                if (colKey === "status") {
                                  handleStatusChange(visit.id, v);
                                } else {
                                  cellSave(visit.id, colKey, v);
                                }
                              }}
                              onCancel={editCancel}
                            />
                          ) : (
                            <CellDisplay
                              raw={info.raw}
                              onEdit={() => {
                                if (info.canEdit) {
                                  if (colKey === "client_name" || colKey === "unit_name") {
                                    const href = colKey === "client_name" ? `/clients/${visit.client_id}` : `/properties/${visit.unit_id}`;
                                    router.push(href);
                                  } else {
                                    cellEdit(visit.id, colKey);
                                  }
                                }
                              }}
                              className={
                                colKey === "status" && visit.status === "upcoming"
                                  ? "text-blue-600 dark:text-blue-400"
                                  : colKey === "status" && visit.status === "completed"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : colKey === "status" && visit.status === "cancelled"
                                  ? "text-red-500"
                                  : colKey === "visit_date"
                                  ? "text-xs"
                                  : ""
                              }
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap border-b px-2 py-1.5 align-middle">
                      <div className="flex items-center gap-0.5">
                        <Link href={`/visits/${visit.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground">
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canEdit && (
                          <>
                            <Link href={`/visits/${visit.id}/edit`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground">
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-red-50 text-red-500 hover:text-red-600" onClick={() => handleDelete(visit.id)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <TableCellContextMenu info={ctxMenu?.info ?? null} position={ctxMenu?.pos ?? null} onClose={() => setCtxMenu(null)} />
      <ConfirmDialog open={!!deleteDialog} onOpenChange={(o) => { if (!o) setDeleteDialog(null); }} title={t("confirmDelete")} confirmLabel={deleting ? "..." : t("delete")} cancelLabel={t("cancel")} variant="destructive" loading={deleting} onConfirm={confirmDelete} />
      <PostVisitNotesDialog
        open={!!postVisitNotes}
        onOpenChange={(o) => { if (!o) setPostVisitNotes(null); }}
        onSave={async (notes) => { if (postVisitNotes) await handlePostVisitNotesSave(postVisitNotes.uid, notes); }}
        defaultValue={postVisitNotes?.currentNotes ?? ""}
      />
    </TooltipProvider>
  );
}
