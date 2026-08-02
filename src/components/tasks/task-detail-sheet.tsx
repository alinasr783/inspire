"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Play,
  CalendarDays,
  Target,
  Trash2,
  Pencil,
} from "lucide-react";
import { fetchTask, updateTask, deleteTask } from "@/lib/task-actions";
import type { TaskRow, TaskStatus } from "@/lib/task-types";
import { cn } from "@/lib/utils";

const statusMeta: Record<TaskStatus, { labelKey: string; icon: React.ComponentType<{ className?: string }>; color: string; bgClass: string }> = {
  todo: { labelKey: "columnTodo", icon: Circle, color: "#6b7280", bgClass: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  in_progress: { labelKey: "columnInProgress", icon: Play, color: "#f59e0b", bgClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  done: { labelKey: "columnDone", icon: CheckCircle2, color: "#10b981", bgClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

export function TaskDetailSheet({
  taskId,
  open,
  onOpenChange,
  isAdmin,
  onDeleted,
  onUpdated,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onDeleted?: () => void;
  onUpdated?: () => void;
}) {
  const t = useTranslations("Tasks");
  const locale = useLocale();
  const [task, setTask] = useState<TaskRow | null>(null);
  const [editing, setEditing] = useState(false);

  const loading = !task;

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!taskId || !open) return;
    let active = true;
    fetchTask(taskId).then((data) => {
      if (!active) return;
      setTask(data);
      if (data) {
        setEditTitle(data.title);
        setEditDesc(data.description ?? "");
        setEditTarget(data.target != null ? String(data.target) : "");
        setEditDueDate(data.due_date);
        setEditStatus(data.status);
      }
    });
    return () => { active = false; };
  }, [taskId, open]);

  if (!taskId) return null;

  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    const result = await updateTask(task.id, {
      title: editTitle.trim() || undefined,
      description: editDesc.trim() || undefined,
      target: editTarget ? Number(editTarget) : undefined,
      due_date: editDueDate || undefined,
      status: editStatus,
    });
    setSaving(false);
    if (result.success) {
      toast(t("updateSuccess"));
      setTask({ ...task, title: editTitle, description: editDesc || null, target: editTarget ? Number(editTarget) : null, due_date: editDueDate, status: editStatus });
      setEditing(false);
      onUpdated?.();
    } else {
      toast.error(t("updateFailed"));
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm(t("deleteConfirm"))) return;
    const result = await deleteTask(task.id);
    if (result.success) {
      toast(t("deleteSuccess"));
      onOpenChange(false);
      onDeleted?.();
    } else {
      toast.error(t("deleteFailed"));
    }
  };

  const StatusIcon = task ? statusMeta[task.status].icon : Circle;
  const meta = task ? statusMeta[task.status] : statusMeta.todo;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = task ? new Date(task.due_date) : new Date();
  due.setHours(0, 0, 0, 0);
  const isOverdue = task && task.status !== "done" && due.getTime() < now.getTime();
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);

  return (
    <Sheet key={taskId} open={open} onOpenChange={onOpenChange}>
      <SheetContent side={locale === "ar" ? "left" : "right"} className="w-[90vw] max-w-md p-0">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !task ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <p className="text-sm">{t("taskNotFound")}</p>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader className="flex flex-row items-center justify-between border-b px-5 py-4">
              <SheetTitle className="text-base">{editing ? t("editTask") : t("taskDetails")}</SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {editing ? (
                <>
                  <div className="space-y-1.5">
                    <Label>{t("title")}</Label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("description")}</Label>
                    <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("target")}</Label>
                      <Input type="number" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("dueDate")}</Label>
                      <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("status")}</Label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      <option value="todo">{t("columnTodo")}</option>
                      <option value="in_progress">{t("columnInProgress")}</option>
                      <option value="done">{t("columnDone")}</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-lg font-bold">{task.title}</h2>
                    {isAdmin && (
                      <button onClick={() => setEditing(true)} className="shrink-0 text-muted-foreground hover:text-foreground">
                        <Pencil className="size-4" />
                      </button>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {task.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium gap-1.5", meta.bgClass)}>
                      <StatusIcon className="size-3" />
                      {t(meta.labelKey)}
                    </Badge>
                    {isOverdue && (
                      <Badge className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        <AlertTriangle className="mr-1 inline size-3" />
                        {t("overdue")}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <CalendarDays className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("dueDate")}:</span>
                      <span className={cn("font-medium", isOverdue && "text-red-600")}>
                        {new Date(task.due_date).toLocaleDateString(
                          locale === "ar" ? "ar-EG" : "en-US",
                          { year: "numeric", month: "long", day: "numeric" }
                        )}
                      </span>
                      {!isOverdue && task.status !== "done" && (
                        <span className="text-xs text-muted-foreground">
                          ({daysLeft === 0 ? t("today") : t("daysLeft", { days: daysLeft })})
                        </span>
                      )}
                    </div>

                    {task.target != null && task.target > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3 text-sm">
                          <Target className="size-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t("target")}:</span>
                          <span className="font-medium">
                            {Math.round((task.progress / 100) * task.target)} / {task.target}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("progress")}</span>
                        <span className="font-semibold">{task.progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            task.progress >= 100 ? "bg-emerald-500" : "bg-primary"
                          )}
                          style={{ width: `${Math.min(task.progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {task.target != null && task.target > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t("targetProgress")}</span>
                          <span className="font-semibold">
                            {Math.round((task.progress / 100) * task.target)}/{task.target}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{ width: `${Math.min(task.progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="border-t px-5 py-4">
              {editing ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                    {t("cancel")}
                  </Button>
                  <Button className="flex-1" onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="me-2 size-4 animate-spin" />}
                    {t("save")}
                  </Button>
                </div>
              ) : (
                isAdmin && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleDelete}
                  >
                    <Trash2 className="me-2 size-4" />
                    {t("deleteTask")}
                  </Button>
                )
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
