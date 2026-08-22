"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { adminCheckIn, adminCheckOut, getEmployees } from "@/lib/attendance-actions";
import type { AttendanceWithEmployee } from "@/lib/attendance-actions";
import { cn } from "@/lib/utils";

interface AdminCheckInDialogProps {
  selectedDate: string;
  onSuccess: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  records: AttendanceWithEmployee[];
}

type Mode = "in" | "out";

export function AdminCheckInDialog({
  selectedDate,
  onSuccess,
}: AdminCheckInDialogProps) {
  const t = useTranslations("Attendance");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("in");
  const [employees, setEmployees] = useState<
    { id: string; first_name: string; second_name: string; position: string }[]
  >([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setMode("in");
    setSelectedEmployee("");
    setTime("09:00");
    setNotes("");
    setLoadingEmployees(true);
    getEmployees()
      .then((data) => {
        setEmployees(data);
        setLoadingEmployees(false);
      })
      .catch(() => {
        setLoadingEmployees(false);
      });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedEmployee) {
      toast.error(t("selectEmployeeRequired"));
      return;
    }

    setLoading(true);
    const result =
      mode === "in"
        ? await adminCheckIn({
            employee_id: selectedEmployee,
            check_in_date: selectedDate,
            check_in_time: time,
            notes,
          })
        : await adminCheckOut({
            employee_id: selectedEmployee,
            check_out_date: selectedDate,
            check_out_time: time,
            notes,
          });
    setLoading(false);

    if (result.success) {
      setOpen(false);
      onSuccess();
    } else if (mode === "in" && result.error === "already-checked-in") {
      toast.error(t("employeeAlreadyCheckedIn"));
    } else if (mode === "out" && result.error === "already-checked-out") {
      toast.error(t("employeeAlreadyCheckedOut"));
    } else if (mode === "out" && result.error === "no-active-checkin") {
      toast.error(t("employeeNoCheckIn"));
    } else {
      toast.error(mode === "in" ? t("adminCheckInFailed") : t("adminCheckOutFailed"));
    }
  }, [selectedEmployee, selectedDate, time, notes, mode, onSuccess, t]);

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen} className="gap-1">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">{t("adminRegister")}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "in" ? t("adminCheckInTitle") : t("adminCheckOutTitle")}
            </DialogTitle>
            <DialogDescription>
              {mode === "in" ? t("adminCheckInDesc") : t("adminCheckOutDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
              <button
                onClick={() => setMode("in")}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                  mode === "in"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("tabCheckIn")}
              </button>
              <button
                onClick={() => setMode("out")}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                  mode === "out"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("tabCheckOut")}
              </button>
            </div>

            <div>
              <label className="text-sm font-medium">{t("employee")}</label>
              {loadingEmployees ? (
                <div className="mt-1.5 h-11 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("selectEmployee")}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {[emp.first_name, emp.second_name].filter(Boolean).join(" ")} — {emp.position || ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">{t("date")}</label>
              <input
                type="text"
                value={selectedDate}
                disabled
                className="mt-1.5 w-full h-11 rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("time")}</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("notes")}</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !selectedEmployee}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                {t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
