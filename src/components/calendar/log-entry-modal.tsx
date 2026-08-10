"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Paperclip,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  addDailyLog,
  updateDailyLog,
  deleteDailyLog,
  uploadAttachment,
} from "@/lib/daily-work-log-actions";
import {
  WORK_CATEGORIES,
  WORK_STATUSES,
} from "@/lib/daily-work-log-types";
import type { DailyWorkLogWithEmployee } from "@/lib/daily-work-log-types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/query-keys";

const CATEGORY_DOT_COLORS: Record<string, string> = {
  تطوير: "bg-blue-500",
  تصميم: "bg-purple-500",
  اجتماعات: "bg-orange-500",
  "دعم فني": "bg-cyan-500",
  تسويق: "bg-pink-500",
  مبيعات: "bg-emerald-500",
  تدريب: "bg-teal-500",
  إداري: "bg-slate-500",
};

const STATUS_COLORS: Record<string, string> = {
  مكتملة: "bg-emerald-500/20 text-emerald-400",
  "قيد التنفيذ": "bg-blue-500/20 text-blue-400",
  متوقفة: "bg-amber-500/20 text-amber-400",
};

const CATEGORY_COLORS: Record<string, string> = {
  تطوير: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  تصميم: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  اجتماعات: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "دعم فني": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  تسويق: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  مبيعات: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  تدريب: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  إداري: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const logSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  hours: z.string().min(1).default("8"),
  category: z.string().min(1).default("تطوير"),
  status: z.string().min(1).default("مكتملة"),
  department: z.string().optional().default(""),
});

type LogFormValues = z.output<typeof logSchema>;

interface LogEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  entries: DailyWorkLogWithEmployee[];
  mode: "view" | "add" | "edit";
  editingLog: DailyWorkLogWithEmployee | null;
  isAdmin: boolean;
  userId: string;
  locale: string;
  onAdd: () => void;
  onEdit: (log: DailyWorkLogWithEmployee) => void;
}

export function LogEntryModal({
  isOpen,
  onClose,
  date,
  entries,
  mode,
  editingLog,
  isAdmin,
  userId,
  locale,
  onAdd,
  onEdit,
}: LogEntryModalProps) {
  const t = useTranslations("Calendar");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<
    { path: string; name: string }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const isFormMode = mode === "add" || mode === "edit";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogFormValues>({
    resolver: zodResolver(logSchema) as any,
    defaultValues:
      mode === "edit" && editingLog
        ? {
            title: editingLog.title,
            description: editingLog.description ?? "",
            hours: String(editingLog.hours),
            category: editingLog.category,
            status: editingLog.status,
            department: editingLog.department ?? "",
          }
        : {
            title: "",
            description: "",
            hours: "8",
            category: "تطوير",
            status: "مكتملة",
            department: "",
          },
  });

  const dateFormatted = new Date(date).toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  const today = new Date().toISOString().split("T")[0];
  const isToday = date === today;

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (attachments.length + files.length > 3) {
        toast.error(
          locale === "ar"
            ? "الحد الأقصى 3 ملفات"
            : "Maximum 3 files allowed"
        );
        return;
      }

      setIsUploading(true);

      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(
            locale === "ar"
              ? "حجم الملف يجب أن يكون أقل من 5MB"
              : "File size must be less than 5MB"
          );
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        const result = await uploadAttachment(formData);
        if (result.success && result.path) {
          setAttachments((prev) => [
            ...prev,
            { path: result.path!, name: file.name },
          ]);
        } else {
          toast.error(
            locale === "ar" ? "فشل رفع الملف" : "File upload failed"
          );
        }
      }

      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [attachments.length, locale]
  );

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onSubmit = useCallback(
    async (values: LogFormValues) => {
      const paths = attachments.map((a) => a.path);
      const hoursNum = parseFloat(values.hours);

      if (mode === "add") {
        const result = await addDailyLog({
          log_date: date,
          title: values.title,
          description: values.description || undefined,
          hours: hoursNum,
          category: values.category,
          status: values.status,
          department: values.department || undefined,
          attachment_paths: paths,
        });
        if (result.success) {
          toast.success(
            locale === "ar" ? "تمت الإضافة بنجاح" : "Entry added successfully"
          );
          queryClient.invalidateQueries({
            queryKey: queryKeys.dailyWorkLogs.all,
          });
          reset();
          setAttachments([]);
          onClose();
        } else {
          toast.error(
            locale === "ar" ? "فشلت الإضافة" : "Failed to add entry"
          );
        }
      } else if (mode === "edit" && editingLog) {
        const existingPaths = editingLog.attachment_paths || [];
        const allPaths = [...existingPaths, ...paths];

        const result = await updateDailyLog(editingLog.id, {
          title: values.title,
          description: values.description || undefined,
          hours: hoursNum,
          category: values.category,
          status: values.status,
          department: values.department || undefined,
          attachment_paths: allPaths,
        });
        if (result.success) {
          toast.success(
            locale === "ar" ? "تم التعديل بنجاح" : "Entry updated successfully"
          );
          queryClient.invalidateQueries({
            queryKey: queryKeys.dailyWorkLogs.all,
          });
          reset();
          setAttachments([]);
          onClose();
        } else {
          toast.error(
            locale === "ar" ? "فشل التعديل" : "Failed to update entry"
          );
        }
      }
    },
    [mode, date, editingLog, attachments, reset, onClose, queryClient, locale]
  );

  const handleDelete = useCallback(
    async (logId: string) => {
      const result = await deleteDailyLog(logId);
      if (result.success) {
        toast.success(
          locale === "ar" ? "تم الحذف بنجاح" : "Deleted successfully"
        );
        queryClient.invalidateQueries({
          queryKey: queryKeys.dailyWorkLogs.all,
        });
        setConfirmDelete(null);
      } else {
        toast.error(
          locale === "ar"
            ? result.error === "delete-same-day-only"
              ? "يمكن حذف سجلات اليوم الحالي فقط"
              : "فشل الحذف"
            : result.error === "delete-same-day-only"
              ? "Can only delete today's entries"
              : "Failed to delete"
        );
      }
    },
    [queryClient, locale]
  );

  const canEditDelete = (entry: DailyWorkLogWithEmployee) => {
    if (isAdmin) return true;
    return entry.employee_id === userId && entry.log_date === today;
  };

  const handleBackToView = useCallback(() => {
    reset();
    setAttachments([]);
    onClose();
  }, [reset, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-[15vh] sm:pt-[10vh]">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleBackToView}
      />
      <div className="relative z-50 mx-4 w-full max-w-lg rounded-xl border bg-card shadow-lg ring-1 ring-foreground/5 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold">
              {isFormMode
                ? mode === "add"
                  ? t("addEntry")
                  : t("editEntry")
                : dateFormatted}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={handleBackToView}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-5 py-4">
          {!isFormMode && (
            <>
              {entries.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                CATEGORY_DOT_COLORS[entry.category] ||
                                  "bg-slate-500"
                              )}
                            />
                            <h4 className="truncate text-sm font-semibold">
                              {entry.title}
                            </h4>
                          </div>
                          {entry.description && (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                              {entry.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                                CATEGORY_COLORS[entry.category] ||
                                  "bg-slate-500/20 text-slate-400"
                              )}
                            >
                              {entry.category}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                                STATUS_COLORS[entry.status]
                              )}
                            >
                              {entry.status}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              {entry.hours}h
                            </span>
                            {entry.department && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                <FileText className="h-2.5 w-2.5" />
                                {entry.department}
                              </span>
                            )}
                          </div>
                          {isAdmin && entry.employee && (
                            <p className="mt-1.5 text-[10px] text-muted-foreground">
                              {[entry.employee.first_name, entry.employee.second_name]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                          )}
                        </div>
                        {canEditDelete(entry) && (
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setAttachments([]);
                                onEdit(entry);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {confirmDelete === entry.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 rounded-lg text-[10px]"
                                  onClick={() => handleDelete(entry.id)}
                                >
                                  {t("confirm")}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 rounded-lg text-[10px]"
                                  onClick={() => setConfirmDelete(null)}
                                >
                                  {t("cancel")}
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                                onClick={() => setConfirmDelete(entry.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4 rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("noEntries")}
                  </p>
                </div>
              )}

              <Button
                className="w-full rounded-lg"
                onClick={onAdd}
                size="sm"
              >
                <Plus className="me-1.5 h-4 w-4" />
                {t("addEntry")}
              </Button>
            </>
          )}

          {isFormMode && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  {t("title")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  className="rounded-lg"
                  placeholder={
                    locale === "ar"
                      ? "ماذا عملت اليوم؟"
                      : "What did you work on today?"
                  }
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">
                    {t(`errors.${errors.title.message}`)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("description")}</Label>
                <Input
                  id="description"
                  className="rounded-lg"
                  placeholder={
                    locale === "ar" ? "تفاصيل إضافية..." : "Additional details..."
                  }
                  {...register("description")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="hours">
                    {t("hours")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    className="rounded-lg"
                    {...register("hours")}
                  />
                  {errors.hours && (
                    <p className="text-xs text-destructive">
                      {t(`errors.${errors.hours.message}`)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">
                    {t("category")} <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="category"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    {...register("category")}
                  >
                    {WORK_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="status">
                    {t("status")} <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="status"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    {...register("status")}
                  >
                    {WORK_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">{t("department")}</Label>
                  <Input
                    id="department"
                    className="rounded-lg"
                    placeholder={
                      locale === "ar" ? "مثال: عقارات" : "e.g. Properties"
                    }
                    {...register("department")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("attachments")}</Label>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <div
                      key={att.path}
                      className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-1 text-xs"
                    >
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                      <span className="max-w-[120px] truncate">
                        {att.name}
                      </span>
                      <button
                        type="button"
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAttachment(i)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {attachments.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-lg text-xs"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="me-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Paperclip className="me-1 h-3 w-3" />
                      )}
                      {t("uploadFile")}
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="sm"
                  className="rounded-lg"
                >
                  {isSubmitting && (
                    <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                  )}
                  {mode === "add" ? t("addEntry") : t("save")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                  onClick={handleBackToView}
                >
                  {t("cancel")}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
