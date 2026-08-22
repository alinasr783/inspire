"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MapPin, Pencil, Trash2, Clock, User, ChevronDown, ChevronUp, Smartphone, Battery } from "lucide-react";
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

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatWorkingHours(checkIn: string, checkOut: string | null): string {
  if (!checkOut) return "";
  const inMs = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  if (isNaN(inMs) || isNaN(outMs) || outMs <= inMs) return "";
  const diffMs = outMs - inMs;
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function getOpenStreetMapUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`;
}

function batteryColorClass(battery: number): string {
  if (battery >= 50) return "text-emerald-600 dark:text-emerald-400";
  if (battery >= 20) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
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
  const [editOutTime, setEditOutTime] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapTitle, setMapTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    if (record.check_out_time) {
      const od = new Date(record.check_out_time);
      setEditOutTime(`${String(od.getHours()).padStart(2, "0")}:${String(od.getMinutes()).padStart(2, "0")}`);
    } else {
      setEditOutTime("");
    }
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
      ...(isAdmin
        ? { check_out_time: editOutTime ? `${editDate}T${editOutTime}:00+02:00` : null }
        : {}),
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
      setMapTitle(`${name} — ${t("checkIn")}`);
      setMapUrl(getOpenStreetMapUrl(record.latitude, record.longitude));
    }
  };

  const openCheckOutMap = (record: AttendanceWithEmployee) => {
    if (record.check_out_latitude && record.check_out_longitude) {
      const name = [record.employee?.first_name, record.employee?.second_name]
        .filter(Boolean)
        .join(" ") || t("employee");
      setMapTitle(`${name} — ${t("checkOut")}`);
      setMapUrl(getOpenStreetMapUrl(record.check_out_latitude, record.check_out_longitude));
    }
  };

  if (records.length === 0) {
    return (
      <>
        <div className="hidden sm:flex flex-col items-center justify-center rounded-2xl border bg-card py-16 shadow-sm ring-1 ring-border/50">
          <Clock className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">{t("noRecords")}</p>
        </div>
        <div className="sm:hidden flex flex-col items-center justify-center rounded-xl border bg-card py-14">
          <Clock className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">{t("noRecords")}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <Card className="hidden sm:flex max-h-[calc(100vh-220px)] flex-col">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {t("title")}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {sortedRecords.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto pt-0">
          <table className="border-separate border-spacing-0 text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              {isAdmin && <col style={{ width: 200 }} />}
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 120 }} />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/95 backdrop-blur-sm">
                {isAdmin && (
                  <th className="border-b border-r px-2.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                    {t("employee")}
                  </th>
                )}
                <th className="border-b border-r px-2.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                  {t("checkIn")}
                </th>
                <th className="border-b border-r px-2.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                  {t("checkOut")}
                </th>
                <th className="border-b border-r px-2.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                  {t("workingHours")}
                </th>
                <th className="border-b border-r px-2.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                  {t("location")}
                </th>
                <th className="border-b border-r px-2.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                  {t("device")}
                </th>
                <th className="border-b border-r px-2.5 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                  {t("notes")}
                </th>
                <th className="border-b px-3 py-2 text-start text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="px-3 py-12 text-center text-muted-foreground"
                  >
                    <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    {t("noRecords")}
                  </td>
                </tr>
              ) : (
                sortedRecords.map((record) => (
                  <tr key={record.id} className="border-b last:border-0 hover:bg-muted/30">
                    {isAdmin && (
                      <td className="border-b border-r px-2.5 py-2 align-middle">
                        <div className="flex items-center gap-2.5">
                          {record.employee?.avatar_url ? (
                            <img
                              src={record.employee.avatar_url}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium">
                              {[record.employee?.first_name, record.employee?.second_name]
                                .filter(Boolean)
                                .join(" ") || "—"}
                            </p>
                            {record.employee?.position && (
                              <p className="truncate text-[11px] text-muted-foreground">
                                {record.employee.position}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="border-b border-r px-2.5 py-2 align-middle">
                      <div className="flex flex-col items-start gap-1">
                        <span className="inline-flex w-fit items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium tabular-nums text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                          {formatTime(record.check_in_time)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(record.check_in_date)}
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-r px-2.5 py-2 align-middle">
                      {record.check_out_time ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                          {formatTime(record.check_out_time)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="border-b border-r px-2.5 py-2 align-middle">
                      {(() => {
                        const hours = formatWorkingHours(record.check_in_time, record.check_out_time);
                        return hours ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium tabular-nums text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                            {hours}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        );
                      })()}
                    </td>
                    <td className="border-b border-r px-2.5 py-2 align-middle">
                      <div className="flex items-center gap-1">
                        {record.latitude && record.longitude ? (
                          <button
                            onClick={() => openMap(record)}
                            title={t("checkInLocation")}
                            className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                          >
                            <MapPin className="h-3 w-3" />
                            {t("in")}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {record.check_out_latitude && record.check_out_longitude ? (
                          <button
                            onClick={() => openCheckOutMap(record)}
                            title={t("checkOutLocation")}
                            className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50"
                          >
                            <MapPin className="h-3 w-3" />
                            {t("out")}
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="border-b border-r px-2.5 py-2 align-middle">
                      <div className="flex flex-col gap-1">
                        {record.check_in_device_name || record.check_in_battery != null ? (
                          <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                            <Smartphone className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">{record.check_in_device_name || t("unknownDevice")}</span>
                            {record.check_in_battery != null && (
                              <span className={`inline-flex shrink-0 items-center gap-0.5 tabular-nums ${batteryColorClass(record.check_in_battery)}`}>
                                <Battery className="h-3 w-3" />
                                {record.check_in_battery}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {(record.check_out_device_name || record.check_out_battery != null) &&
                          record.check_out_device_name !== record.check_in_device_name && (
                            <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                              <Smartphone className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">{record.check_out_device_name || t("unknownDevice")}</span>
                              {record.check_out_battery != null && (
                                <span className={`inline-flex shrink-0 items-center gap-0.5 tabular-nums ${batteryColorClass(record.check_out_battery)}`}>
                                  <Battery className="h-3 w-3" />
                                  {record.check_out_battery}%
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </td>
                    <td className="border-b border-r px-2.5 py-2 align-middle">
                      <span className="block max-w-[160px] truncate text-[13px] text-muted-foreground">
                        {record.notes || "—"}
                      </span>
                    </td>
                    <td className="border-b px-2 py-2 align-middle">
                      <div className="flex items-center gap-0.5">
                        {(isAdmin || record.employee_id === userId) && (
                          <button
                            onClick={() => handleEdit(record)}
                            title={t("edit")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteDialog(record.id)}
                            title={t("delete")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
                        {record.check_out_time && (
                          <>
                            <span className="text-muted-foreground text-xs">→</span>
                            <span className="font-mono font-bold text-base tabular-nums">
                              {formatTime(record.check_out_time)}
                            </span>
                          </>
                        )}
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
                    <div>
                      <span className="text-muted-foreground">{t("workingHours")}</span>
                      <p className="font-medium text-emerald-600">
                        {formatWorkingHours(record.check_in_time, record.check_out_time) || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("checkIn")}</span>
                      <p className="font-medium font-mono">{formatTime(record.check_in_time)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("checkOut")}</span>
                      <p className="font-medium font-mono">
                        {record.check_out_time ? formatTime(record.check_out_time) : "—"}
                      </p>
                    </div>
                    {(record.latitude && record.longitude) && (
                      <div>
                        <span className="text-muted-foreground">{t("checkInLocation")}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <button
                            onClick={() => openMap(record)}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                          >
                            <MapPin className="h-3 w-3" />
                            {t("viewOnMap")}
                          </button>
                        </div>
                      </div>
                    )}
                    {(record.check_out_latitude && record.check_out_longitude) && (
                      <div>
                        <span className="text-muted-foreground">{t("checkOutLocation")}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <button
                            onClick={() => openCheckOutMap(record)}
                            className="inline-flex items-center gap-1 text-amber-600 hover:underline font-medium"
                          >
                            <MapPin className="h-3 w-3" />
                            {t("viewOnMap")}
                          </button>
                        </div>
                      </div>
                    )}
                    {(record.check_in_device_name || record.check_in_battery != null || record.check_out_device_name || record.check_out_battery != null) && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">{t("device")}</span>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Smartphone className="h-3 w-3 shrink-0" />
                            <span className="font-medium text-foreground">{t("checkIn")}:</span>
                            <span className="truncate">{record.check_in_device_name || t("unknownDevice")}</span>
                            {record.check_in_battery != null && (
                              <span className={`inline-flex shrink-0 items-center gap-0.5 tabular-nums ${batteryColorClass(record.check_in_battery)}`}>
                                <Battery className="h-3 w-3" />
                                {record.check_in_battery}%
                              </span>
                            )}
                          </div>
                          {(record.check_out_device_name || record.check_out_battery != null) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Smartphone className="h-3 w-3 shrink-0" />
                              <span className="font-medium text-foreground">{t("checkOut")}:</span>
                              <span className="truncate">{record.check_out_device_name || t("unknownDevice")}</span>
                              {record.check_out_battery != null && (
                                <span className={`inline-flex shrink-0 items-center gap-0.5 tabular-nums ${batteryColorClass(record.check_out_battery)}`}>
                                  <Battery className="h-3 w-3" />
                                  {record.check_out_battery}%
                                </span>
                              )}
                            </div>
                          )}
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
              {isAdmin && (
                <div>
                  <label className="text-sm font-medium">{t("checkOut")}</label>
                  <input
                    type="time"
                    value={editOutTime}
                    onChange={(e) => setEditOutTime(e.target.value)}
                    className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {t("checkOutEditHint")}
                  </p>
                </div>
              )}
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

      {/* Map View */}
      {mapUrl && (
        <Dialog open={!!mapUrl} onOpenChange={() => setMapUrl(null)}>
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
      )}
    </>
  );
}
