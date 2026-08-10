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
import { MapPin, Pencil, Trash2, Clock, User, ChevronDown, ChevronUp } from "lucide-react";
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

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getOpenStreetMapUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`;
}

function getGoogleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
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
  const [mapTitle, setMapTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showMobileMap, setShowMobileMap] = useState(false);

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

  const openMap = (record: AttendanceWithEmployee) => {
    if (record.latitude && record.longitude) {
      const name = [record.employee?.first_name, record.employee?.second_name]
        .filter(Boolean)
        .join(" ") || t("employee");
      setMapTitle(name);
      setMapUrl(getOpenStreetMapUrl(record.latitude, record.longitude));
      setShowMobileMap(true);
    }
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(getGoogleMapsUrl(lat, lng), "_blank");
  };

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16">
        <Clock className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 text-sm text-muted-foreground">{t("noRecords")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-foreground/5">
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
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
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
                    <div className="flex flex-col">
                      <span className="font-mono font-medium tabular-nums">
                        {formatTime(record.check_in_time)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(record.check_in_date)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {record.latitude && record.longitude ? (
                      <button
                        onClick={() => openMap(record)}
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

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {sortedRecords.map((record) => {
          const employeeName = [record.employee?.first_name, record.employee?.second_name]
            .filter(Boolean)
            .join(" ") || "—";
          const isExpanded = expandedId === record.id;

          return (
            <div
              key={record.id}
              className="rounded-xl border bg-card shadow-sm ring-1 ring-foreground/5 overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : record.id)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {record.employee?.avatar_url ? (
                      <img
                        src={record.employee.avatar_url}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover shrink-0"
                      />
                    ) : isAdmin ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                    ) : null}
                    <div>
                      {isAdmin && (
                        <p className="text-sm font-medium truncate">{employeeName}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base tabular-nums">
                          {formatTime(record.check_in_time)}
                        </span>
                        {record.latitude && record.longitude && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-950">
                            <MapPin className="h-2.5 w-2.5" />
                            GPS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">{t("date")}</span>
                      <p className="font-medium">{formatDate(record.check_in_date)}</p>
                    </div>
                    {record.latitude && record.longitude && (
                      <div>
                        <span className="text-muted-foreground">{t("location")}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <button
                            onClick={() => openMap(record)}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                          >
                            <MapPin className="h-3 w-3" />
                            {t("viewOnMap")}
                          </button>
                          <button
                            onClick={() => openGoogleMaps(record.latitude!, record.longitude!)}
                            className="text-[10px] text-muted-foreground hover:text-foreground underline"
                          >
                            Google Maps
                          </button>
                        </div>
                      </div>
                    )}
                    {record.notes && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">{t("notes")}</span>
                        <p className="font-medium">{record.notes}</p>
                      </div>
                    )}
                  </div>

                  {canEdit(record) && (
                    <div className="flex items-center gap-1 pt-1 border-t">
                      {(isAdmin || record.employee_id === userId) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(record)}
                          className="h-8 gap-1 text-xs"
                        >
                          <Pencil className="h-3 w-3" />
                          {t("edit")}
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteDialog(record.id)}
                          className="h-8 gap-1 text-xs text-red-500 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t("delete")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      {editId && (
        <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
                  className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("time")}</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("notes")}</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setEditId(null)}>
                  {t("cancel")}
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? t("saving") : t("save")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm */}
      {deleteDialog && (
        <>
          {/* Desktop */}
          <div className="hidden sm:block">
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
          </div>

          {/* Mobile Bottom Sheet */}
          <div className="sm:hidden">
            <div
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in-0"
              onClick={() => setDeleteDialog(null)}
            />
            <div className="fixed inset-x-0 bottom-0 z-[60] animate-in slide-in-from-bottom rounded-t-2xl border-t border-border bg-card p-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}>
              <div className="mb-2 mx-auto h-1 w-10 rounded-full bg-muted-foreground/20" />
              <h3 className="text-base font-semibold mb-2">{t("deleteConfirm")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("deleteConfirm")}</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={() => setDeleteDialog(null)}
                  disabled={deleting}
                >
                  {t("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 h-11"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "..." : t("delete")}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Map View */}
      {mapUrl && (
        <>
          {/* Desktop */}
          <div className="hidden sm:block">
            <Dialog open={!!mapUrl} onOpenChange={() => { setMapUrl(null); setShowMobileMap(false); }}>
              <DialogContent className="sm:max-w-2xl p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-base">{t("employeeLocation")}: {mapTitle}</DialogTitle>
                </DialogHeader>
                <div className="aspect-[4/3] sm:aspect-video w-full overflow-hidden rounded-lg border">
                  <iframe
                    src={mapUrl}
                    className="h-full w-full border-0"
                    loading="lazy"
                    title="OpenStreetMap"
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Mobile Bottom Sheet */}
          {showMobileMap && (
            <div className="sm:hidden">
              <div
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in-0"
                onClick={() => { setMapUrl(null); setShowMobileMap(false); }}
              />
              <div className="fixed inset-x-0 bottom-0 z-[60] animate-in slide-in-from-bottom rounded-t-2xl border-t border-border bg-card" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)", maxHeight: "75vh" }}>
                <div className="sticky top-0 bg-card rounded-t-2xl pt-4 px-5 pb-3 border-b border-border">
                  <div className="mb-2 mx-auto h-1 w-10 rounded-full bg-muted-foreground/20" />
                  <h3 className="text-base font-semibold">{t("employeeLocation")}: {mapTitle}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">OpenStreetMap</span>
                  </div>
                </div>
                <div className="aspect-[4/3] w-full">
                  <iframe
                    src={mapUrl}
                    className="h-full w-full border-0"
                    loading="lazy"
                    title="OpenStreetMap"
                  />
                </div>
                <div className="p-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setMapUrl(null); setShowMobileMap(false); }}
                    className="h-10 px-6"
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
