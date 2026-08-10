"use client";

import { useState, useCallback, useEffect } from "react";
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
import { adminCheckIn, getEmployees } from "@/lib/attendance-actions";
import type { AttendanceWithEmployee } from "@/lib/attendance-actions";

interface AdminCheckInDialogProps {
  selectedDate: string;
  onSuccess: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  records: AttendanceWithEmployee[];
}

export function AdminCheckInDialog({
  selectedDate,
  onSuccess,
}: AdminCheckInDialogProps) {
  const t = useTranslations("Attendance");
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<
    { id: string; first_name: string; second_name: string; position: string }[]
  >([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingEmployees(true);
      getEmployees().then((data) => {
        setEmployees(data);
        setLoadingEmployees(false);
      });
      setSelectedEmployee("");
      setTime("09:00");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!selectedEmployee) {
      toast.error(t("selectEmployeeRequired"));
      return;
    }

    setLoading(true);
    const result = await adminCheckIn({
      employee_id: selectedEmployee,
      check_in_date: selectedDate,
      check_in_time: time,
      notes,
    });
    setLoading(false);

    if (result.success) {
      setOpen(false);
      onSuccess();
    } else if (result.error === "already-checked-in") {
      toast.error(t("employeeAlreadyCheckedIn"));
    } else {
      toast.error(t("adminCheckInFailed"));
    }
  }, [selectedEmployee, selectedDate, time, notes, onSuccess, t]);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">{t("adminCheckIn")}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminCheckInTitle")}</DialogTitle>
            <DialogDescription>{t("adminCheckInDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("employee")}</label>
              {loadingEmployees ? (
                <div className="mt-1 h-9 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="mt-1 w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
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
                className="mt-1 w-full h-9 rounded-lg border border-input bg-muted px-3 py-1 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("time")}</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("notes")}</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                className="mt-1 w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
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
