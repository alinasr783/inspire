"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MapPin, Pencil, Trash2, Clock, User } from "lucide-react";
import type { AttendanceWithEmployee } from "@/lib/attendance-actions";
import { updateAttendance, deleteAttendance } from "@/lib/attendance-actions";
import { toast } from "sonner";

interface AttendanceTableProps {
  records: AttendanceWithEmployee[];
  locale: string;
  isAdmin: boolean;
  userId: string;
  onUpdate: () => void;
  onDelete: () => void;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getOpenStreetMapUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`;
}

export function AttendanceTable({
  records,
  isAdmin,
  userId,
  onUpdate,
  onDelete,
}: AttendanceTableProps) {
  const t = useTranslations("Attendance");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(b.check_in_time).getTime() -
          new Date(a.check_in_time).getTime()
      ),
    [records]
  );

  const canEdit = (record: AttendanceWithEmployee) =>
    isAdmin || record.employee_id === userId;

  const handleEdit = (record: AttendanceWithEmployee) => {
    setEditId(record.id);
    const d = new Date(record.check_in_time);
    setEditTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    setEditDate(record.check_in_date);
    setEditNotes(record.notes ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    const result = await updateAttendance(editId, {
      check_in_date: editDate,
      check_in_time: editTime,
      notes: editNotes,
    });
    setSaving(false);
    if (result.success) {
      setEditId(null);
      onUpdate();
    } else {
      toast.error(t("updateFailed"));
    }
  };

  const handleDelete = useCallback(async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    const result = await deleteAttendance(deleteDialog);
    setDeleting(false);
    if (result.success) {
      setDeleteDialog(null);
      onDelete();
    } else {
      toast.error(t("deleteFailed"));
    }
  }, [deleteDialog, onDelete, t]);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16">
        <Clock className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-sm text-muted-foreground">{t("noRecords")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-foreground/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    {t("employee")}
                  </th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                  {t("time")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">
                  {t("location")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">
                  {t("notes")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record) => (
                <tr key={record.id} className="border-b last:border-0 hover:bg-muted/30">
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {record.employee?.avatar_url ? (
                          <img
                            src={record.employee.avatar_url}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        <span className="font-medium">
                          {[record.employee?.first_name, record.employee?.second_name]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium tabular-nums">
                      {formatTime(record.check_in_time)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {record.latitude && record.longitude ? (
                      <button
                        onClick={() =>
                          setMapUrl(
                            getOpenStreetMapUrl(record.latitude!, record.longitude!)
                          )
                        }
                        className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                      >
                        <MapPin className="h-3 w-3" />
                        {t("viewOnMap")}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell max-w-[200px] truncate">
                    <span className="text-xs text-muted-foreground">
                      {record.notes || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canEdit(record) ? (
                      <div className="flex items-center gap-1">
                        {(isAdmin || record.employee_id === userId) && (
                          <button
                            onClick={() => handleEdit(record)}
                            className="rounded p-1 hover:bg-muted"
                            title={t("edit")}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteDialog(record.id)}
                            className="rounded p-1 hover:bg-muted"
                            title={t("delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editId && (
        <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("editAttendance")}</DialogTitle>
              <DialogDescription>{t("editAttendanceDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t("date")}</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="mt-1 w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("time")}</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="mt-1 w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("notes")}</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  className="mt-1 w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditId(null)}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? t("saving") : t("save")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={(o) => { if (!o) setDeleteDialog(null); }}
        title={t("deleteConfirm")}
        confirmLabel={deleting ? "..." : t("delete")}
        cancelLabel={t("cancel")}
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />

      {mapUrl && (
        <Dialog open={!!mapUrl} onOpenChange={() => setMapUrl(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("employeeLocation")}</DialogTitle>
            </DialogHeader>
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <iframe
                src={mapUrl}
                className="h-full w-full border-0"
                loading="lazy"
                title="OpenStreetMap"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
