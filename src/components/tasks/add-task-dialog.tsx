"use client";

import { useState, useCallback } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { createTask } from "@/lib/task-actions";
import { getFolders, type Folder } from "@/lib/unconfirmed-folder-actions";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  const isMobile = useMediaQuery("(max-width: 767px)");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState(preselectedEmployeeId ?? "");
  const [submitting, setSubmitting] = useState(false);

  const [taskType, setTaskType] = useState("");
  const [folderId, setFolderId] = useState("");
  const [fileId, setFileId] = useState("");
  const [recordsTarget, setRecordsTarget] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  const selectedFolder = folders.find((f) => f.id === folderId);
  const isConfirmation = taskType === "confirmation";

  const handleTaskTypeChange = useCallback(async (val: string) => {
    setTaskType(val);
    setFolderId("");
    setFileId("");
    setRecordsTarget("");
    if (val === "confirmation") {
      setLoadingFolders(true);
      try {
        const data = await getFolders();
        setFolders(data);
      } catch {
        toast.error("Failed to load folders");
        setTaskType("");
      } finally {
        setLoadingFolders(false);
      }
    } else {
      setFolders([]);
    }
  }, []);

  const handleFolderChange = useCallback((val: string) => {
    setFolderId(val);
    setFileId("");
  }, []);

  const handleClose = useCallback(() => {
    setTitle("");
    setDescription("");
    setTarget("");
    setDueDate("");
    setTaskType("");
    setFolderId("");
    setFileId("");
    setRecordsTarget("");
    setFolders([]);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = async () => {
    if (!title.trim() || !dueDate || !assignedTo) {
      toast.error(t("fillRequired"));
      return;
    }
    if (isConfirmation && (!folderId || !fileId || !recordsTarget)) {
      toast.error(t("fillRequired"));
      return;
    }

    setSubmitting(true);
    const result = await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      target: isConfirmation ? Number(recordsTarget) : target ? Number(target) : undefined,
      due_date: dueDate,
      assigned_to: assignedTo,
      status: "todo",
      task_type: isConfirmation ? "confirmation" : null,
      folder_id: isConfirmation ? folderId : null,
      file_id: isConfirmation ? fileId : null,
      records_target: isConfirmation ? Number(recordsTarget) : null,
    });

    setSubmitting(false);

    if (result.success) {
      toast.success(t("createSuccess"));
      handleClose();
    } else {
      toast.error(t(result.error));
    }
  };

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t("taskType")}</Label>
        <select
          value={taskType}
          onChange={(e) => handleTaskTypeChange(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">{t("taskTypeDefault")}</option>
          <option value="confirmation">{t("taskTypeConfirmation")}</option>
        </select>
      </div>

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

      {isConfirmation ? (
        <>
          <div className="space-y-1.5">
            <Label>{t("selectFolder")} <span className="text-destructive">*</span></Label>
            <select
              value={folderId}
              onChange={(e) => handleFolderChange(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              disabled={loadingFolders}
            >
              <option value="">{loadingFolders ? t("loading") : t("selectFolderPlaceholder")}</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          {folderId && (
            <div className="space-y-1.5">
              <Label>{t("selectFile")} <span className="text-destructive">*</span></Label>
              <select
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">{t("selectFilePlaceholder")}</option>
                {(selectedFolder?.files ?? []).map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
        </>
      ) : (
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
      )}

      {isConfirmation && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t("recordsTarget")} <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              value={recordsTarget}
              onChange={(e) => setRecordsTarget(e.target.value)}
              placeholder="50"
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
      )}

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
        <Button variant="outline" onClick={handleClose}>
          {t("cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="me-2 size-4 animate-spin" />}
          {t("createTask")}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet key={preselectedEmployeeId ?? "_new"} open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto px-4 pb-6">
          <SheetHeader>
            <SheetTitle>{t("newTask")}</SheetTitle>
            <SheetDescription>{t("newTaskDesc")}</SheetDescription>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog key={preselectedEmployeeId ?? "_new"} open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newTask")}</DialogTitle>
          <DialogDescription>{t("newTaskDesc")}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
