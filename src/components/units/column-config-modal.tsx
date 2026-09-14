"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Plus, Trash2, GripVertical, Check, X, AlertTriangle, Pencil } from "lucide-react";
import {
  getColumnConfig,
  saveColumnConfig,
  deleteColumnConfig,
  updateColumnOrder,
  updateColumnConfig,
} from "@/lib/unit-config-actions";
import type { ColumnConfig, ColumnType } from "@/lib/unit-config";

const TYPE_OPTIONS: Array<{ value: ColumnType; labelAr: string; labelEn: string }> = [
  { value: "text", labelAr: "نص", labelEn: "Text" },
  { value: "number", labelAr: "رقم", labelEn: "Number" },
  { value: "date", labelAr: "تاريخ", labelEn: "Date" },
  { value: "select", labelAr: "اختيار واحد", labelEn: "Select" },
  { value: "multi_select", labelAr: "اختيار متعدد", labelEn: "Multi-select" },
  { value: "checkbox", labelAr: "نعم / لا", labelEn: "Checkbox" },
  { value: "textarea", labelAr: "نص طويل", labelEn: "Textarea" },
];

const OPTION_TYPES: ColumnType[] = ["select", "multi_select"];

export function ColumnConfigModal() {
  const t = useTranslations("Properties");
  const [open, setOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [adding, setAdding] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editKey, setEditKey] = useState("");
  const [editLabelAr, setEditLabelAr] = useState("");
  const [editLabelEn, setEditLabelEn] = useState("");
  const [editType, setEditType] = useState<ColumnType>("text");
  const [editOptions, setEditOptions] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);

  const [formKey, setFormKey] = useState("");
  const [formLabelAr, setFormLabelAr] = useState("");
  const [formLabelEn, setFormLabelEn] = useState("");
  const [formType, setFormType] = useState<ColumnType>("text");
  const [formOptions, setFormOptions] = useState("");

  const load = useCallback(async () => {
    const data = await getColumnConfig();
    setColumns(data);
  }, []);

  useEffect(() => {
    if (open) {
      load();
      setAdding(false);
      setEditingId(null);
      setFormError(null);
    }
  }, [open, load]);

  const resetForm = () => {
    setFormKey("");
    setFormLabelAr("");
    setFormLabelEn("");
    setFormType("text");
    setFormOptions("");
    setAdding(false);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    const fd = new FormData();
    fd.append("key", formKey.trim());
    fd.append("label_ar", formLabelAr.trim());
    fd.append("label_en", formLabelEn.trim());
    fd.append("type", formType);
    fd.append("options", formOptions);
    fd.append("sort_order", String(columns.length));
    fd.append("enabled", "true");

    const result = await saveColumnConfig(fd);
    if ((result as { success?: boolean }).success) {
      resetForm();
      await load();
    } else {
      setFormError((result as { error?: string }).error ?? "save-failed");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteColumnConfig(id);
    if ((result as { success?: boolean }).success) {
      await load();
    }
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...columns];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setColumns(reordered);
    setDragIdx(idx);
  };

  const handleDrop = async () => {
    setDragIdx(null);
    const updated = columns.map((col, i) => ({ id: col.id, sort_order: i }));
    await updateColumnOrder(updated);
  };

  const startEdit = (col: ColumnConfig) => {
    setEditingId(col.id);
    setEditKey(col.key);
    setEditLabelAr(col.label_ar);
    setEditLabelEn(col.label_en);
    setEditType(col.type);
    setEditOptions((col.options ?? []).join("\n"));
    setEditEnabled(col.enabled);
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditKey("");
    setEditLabelAr("");
    setEditLabelEn("");
    setEditType("text");
    setEditOptions("");
    setEditEnabled(true);
    setFormError(null);
  };

  const editingOriginal = editingId ? columns.find((c) => c.id === editingId) ?? null : null;
  const keyOrTypeChanged =
    !!editingOriginal && (editKey.trim() !== editingOriginal.key || editType !== editingOriginal.type);

  const saveEdit = async () => {
    if (!editingId || !editLabelAr.trim() || !editLabelEn.trim()) return;
    if (!editingOriginal?.is_builtin && !editKey.trim()) return;
    setSaving(true);
    setFormError(null);
    const result = await updateColumnConfig(editingId, {
      key: editKey.trim(),
      label_ar: editLabelAr.trim(),
      label_en: editLabelEn.trim(),
      type: editType,
      options: editOptions,
      enabled: editEnabled,
    });
    setSaving(false);
    if ((result as { success?: boolean }).success) {
      setEditingId(null);
      await load();
    } else {
      setFormError((result as { error?: string }).error ?? "save-failed");
    }
  };

  const friendlyError = (code: string | null) => {
    if (!code) return null;
    switch (code) {
      case "options-required":
        return "أضف خيارا واحدا على الأقل (سطر لكل خيار)";
      case "key-exists":
        return "هذا المفتاح مستخدم بالفعل، اختر مفتاحا آخر";
      case "validation-failed":
      case "invalid-key":
        return "تحقق من البيانات: المفتاح حروف وأرقام و _ فقط، والأسماء مطلوبة";
      default:
        return "تعذر الحفظ، حاول مرة أخرى";
    }
  };

  const typeLabel = (type: ColumnType) =>
    TYPE_OPTIONS.find((o) => o.value === type)?.labelAr ?? type;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Settings2 className="h-3.5 w-3.5" />
        {t("manageColumns")}
      </SheetTrigger>
      <SheetContent className="max-h-[92dvh] overflow-hidden sm:max-w-md sm:p-6">
        <SheetHeader className="mb-4 shrink-0">
          <SheetTitle>{t("manageColumns")}</SheetTitle>
          <SheetDescription>
            {t("manageColumns")}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2 pe-0.5">
          {columns.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noCustomColumns")}</p>
          ) : (
            <div className="space-y-2">
              {columns.map((col, idx) => (
                <div
                  key={col.id}
                  draggable={editingId !== col.id}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  className={`flex items-start gap-2 rounded-lg border p-3 text-sm cursor-grab active:cursor-grabbing ${
                    dragIdx === idx ? "opacity-50" : ""
                  } ${!col.enabled ? "opacity-60" : ""}`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-1">
                    {editingId === col.id ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">المفتاح (key)</Label>
                          <Input
                            value={editKey}
                            onChange={(e) => setEditKey(e.target.value)}
                            className="h-7 text-xs font-mono"
                            placeholder="delivery_date"
                            dir="ltr"
                            disabled={col.is_builtin}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">الاسم بالعربية</Label>
                            <Input
                              value={editLabelAr}
                              onChange={(e) => setEditLabelAr(e.target.value)}
                              className="h-7 text-xs"
                              placeholder="العربية"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">الاسم بالإنجليزية</Label>
                            <Input
                              value={editLabelEn}
                              onChange={(e) => setEditLabelEn(e.target.value)}
                              className="h-7 text-xs"
                              placeholder="English"
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">نوع البيانات</Label>
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as ColumnType)}
                              disabled={col.is_builtin}
                              className="flex h-7 w-full rounded-md border border-input bg-transparent px-1.5 text-xs text-foreground disabled:opacity-50 [&>option]:text-foreground [&>option]:bg-background"
                            >
                              {TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.labelAr} ({o.labelEn})
                                </option>
                              ))}
                            </select>
                          </div>
                          <label className="flex items-end gap-1.5 pb-1 text-xs cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={editEnabled}
                              onChange={(e) => setEditEnabled(e.target.checked)}
                              disabled={col.is_builtin}
                              className="h-3.5 w-3.5"
                            />
                            ظاهر في الجدول
                          </label>
                        </div>
                        {OPTION_TYPES.includes(editType) && !col.is_builtin && (
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">الاختيارات (خيار في كل سطر)</Label>
                            <textarea
                              value={editOptions}
                              onChange={(e) => setEditOptions(e.target.value)}
                              className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                              placeholder={"اختيار 1\nاختيار 2"}
                            />
                          </div>
                        )}
                        {col.is_builtin && (
                          <p className="text-[11px] text-muted-foreground">
                            عمود أساسي: يمكن تعديل الأسماء فقط
                          </p>
                        )}
                        {keyOrTypeChanged && !col.is_builtin && (
                          <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                            <span>
                              تنبيه: تغيير المفتاح أو النوع قد يؤثر على البيانات المحفوظة في هذا العمود. تأكد قبل الحفظ.
                            </span>
                          </div>
                        )}
                        {formError && editingId === col.id && (
                          <p className="text-[11px] text-destructive">{friendlyError(formError)}</p>
                        )}
                        <div className="flex gap-1">
                          <Button size="icon-xs" variant="ghost" onClick={saveEdit} disabled={saving}>
                            <Check className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button size="icon-xs" variant="ghost" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium truncate">
                          {col.label_ar} / {col.label_en}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-mono" dir="ltr">{col.key}</span>
                          {" · "}
                          {typeLabel(col.type)}
                          {OPTION_TYPES.includes(col.type) && col.options?.length
                            ? ` (${col.options.length})`
                            : ""}
                          {col.is_builtin && <span className="ms-1 text-primary">(built-in)</span>}
                          {!col.enabled && <span className="ms-1">(مخفي)</span>}
                        </p>
                      </>
                    )}
                  </div>
                  {editingId !== col.id && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => startEdit(col)}
                        title="تعديل العمود"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {!col.is_builtin && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(col.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {adding ? (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{t("columnKey")}</Label>
                <Input value={formKey} onChange={(e) => setFormKey(e.target.value)} className="h-8 font-mono text-xs" dir="ltr" />
                <p className="text-xs text-muted-foreground">e.g. delivery_date</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{t("columnLabelAr")}</Label>
                  <Input value={formLabelAr} onChange={(e) => setFormLabelAr(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{t("columnLabelEn")}</Label>
                  <Input value={formLabelEn} onChange={(e) => setFormLabelEn(e.target.value)} className="h-8 text-xs" dir="ltr" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">{t("columnType")}</Label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as ColumnType)}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs text-foreground [&>option]:text-foreground [&>option]:bg-background"
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.labelAr} ({o.labelEn})
                    </option>
                  ))}
                </select>
              </div>
              {OPTION_TYPES.includes(formType) && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{t("columnOptions")}</Label>
                  <textarea
                    value={formOptions}
                    onChange={(e) => setFormOptions(e.target.value)}
                    className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                    placeholder={"اختيار 1\nاختيار 2"}
                  />
                </div>
              )}
              {formError && adding && (
                <p className="text-xs text-destructive">{friendlyError(formError)}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSave} disabled={!formKey.trim() || !formLabelAr.trim() || !formLabelEn.trim()}>
                  {t("save")}
                </Button>
                <Button size="sm" variant="outline" onClick={resetForm}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" className="w-full gap-1.5" onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" />
              {t("addColumn")}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
