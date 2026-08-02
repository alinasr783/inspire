"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createTask } from "@/lib/task-actions";
import { Loader2 } from "lucide-react";

export function AddTaskDialog({
  open,
  onOpenChange,
  employees,
  preselectedEmployeeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: { id: string; name: string }[];
  preselectedEmployeeId?: string;
}) {
  const t = useTranslations("Tasks");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState(preselectedEmployeeId ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !dueDate || !assignedTo) {
      toast.error(t("fillRequired"));
      return;
    }

    setSubmitting(true);
    const result = await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      target: target ? Number(target) : undefined,
      due_date: dueDate,
      assigned_to: assignedTo,
      status: "todo",
    });

    setSubmitting(false);

    if (result.success) {
      toast(t("createSuccess"));
      setTitle("");
      setDescription("");
      setTarget("");
      setDueDate("");
      setAssignedTo(preselectedEmployeeId ?? "");
      onOpenChange(false);
    } else {
      toast.error(t(result.error));
    }
  };

  return (
    <Dialog key={preselectedEmployeeId ?? "_new"} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newTask")}</DialogTitle>
          <DialogDescription>{t("newTaskDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>{t("title")} <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descPlaceholder")}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t("target")}</Label>
              <Input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="10"
                min={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("dueDate")} <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("assignTo")} <span className="text-destructive">*</span></Label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("selectEmployee")}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="me-2 size-4 animate-spin" />}
              {t("createTask")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
