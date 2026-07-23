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
import { Settings2, Plus, Trash2, GripVertical, Check, X } from "lucide-react";
import {
  getColumnConfig,
  saveColumnConfig,
  deleteColumnConfig,
  updateColumnOrder,
  renameColumnConfig,
  type ColumnConfig,
} from "@/lib/client-config-actions";

export function ColumnConfigModal() {
  const t = useTranslations("Clients");
  const [open, setOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [adding, setAdding] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabelAr, setEditLabelAr] = useState("");
  const [editLabelEn, setEditLabelEn] = useState("");

  const [formKey, setFormKey] = useState("");
  const [formLabelAr, setFormLabelAr] = useState("");
  const [formLabelEn, setFormLabelEn] = useState("");
  const [formType, setFormType] = useState<ColumnConfig["type"]>("text");
  const [formOptions, setFormOptions] = useState("");

  const load = useCallback(async () => {
    const data = await getColumnConfig();
    setColumns(data);
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const resetForm = () => {
    setFormKey("");
    setFormLabelAr("");
    setFormLabelEn("");
    setFormType("text");
    setFormOptions("");
    setAdding(false);
  };

  const handleSave = async () => {
    const fd = new FormData();
    fd.append("key", formKey);
    fd.append("label_ar", formLabelAr);
    fd.append("label_en", formLabelEn);
    fd.append("type", formType);
    fd.append("options", formOptions);
    fd.append("sort_order", String(columns.length));
    fd.append("enabled", "true");

    const result = await saveColumnConfig(fd);
    if (result.success) {
      resetForm();
      await load();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteColumnConfig(id);
    if (result.success) {
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
    setEditLabelAr(col.label_ar);
    setEditLabelEn(col.label_en);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabelAr("");
    setEditLabelEn("");
  };

  const saveEdit = async () => {
    if (!editingId || !editLabelAr.trim() || !editLabelEn.trim()) return;
    await renameColumnConfig(editingId, editLabelAr.trim(), editLabelEn.trim());
    setEditingId(null);
    await load();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
      >
        <Settings2 className="h-3.5 w-3.5" />
        {t("manageColumns")}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
        <SheetHeader className="mb-6">
          <SheetTitle>{t("manageColumns")}</SheetTitle>
          <SheetDescription>
            {t("manageColumns")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {columns.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noCustomColumns")}</p>
          ) : (
            <div className="space-y-2">
              {columns.map((col, idx) => (
                <div
                  key={col.id}
                  draggable
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
                        <Input
                          value={editLabelAr}
                          onChange={(e) => setEditLabelAr(e.target.value)}
                          className="h-7 text-xs"
                          placeholder="العربية"
                        />
                        <Input
                          value={editLabelEn}
                          onChange={(e) => setEditLabelEn(e.target.value)}
                          className="h-7 text-xs"
                          placeholder="English"
                        />
                        <div className="flex gap-1">
                          <Button size="icon-xs" variant="ghost" onClick={saveEdit}>
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
                          {col.key} · {col.type}
                          {col.is_builtin && <span className="ms-1 text-primary">(built-in)</span>}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => startEdit(col)}
                      disabled={editingId !== null}
                    >
                      <Settings2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(col.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {adding ? (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{t("columnKey")}</Label>
                <Input value={formKey} onChange={(e) => setFormKey(e.target.value)} className="h-8 text-xs" />
                <p className="text-xs text-muted-foreground">e.g. delivery_date</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{t("columnLabelAr")}</Label>
                  <Input value={formLabelAr} onChange={(e) => setFormLabelAr(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{t("columnLabelEn")}</Label>
                  <Input value={formLabelEn} onChange={(e) => setFormLabelEn(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">{t("columnType")}</Label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as ColumnConfig["type"])}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs text-foreground [&>option]:text-foreground [&>option]:bg-background"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select</option>
                  <option value="textarea">Textarea</option>
                </select>
              </div>
              {formType === "select" && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{t("columnOptions")}</Label>
                  <textarea
                    value={formOptions}
                    onChange={(e) => setFormOptions(e.target.value)}
                    className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                    placeholder="one per line"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSave} disabled={!formKey || !formLabelAr || !formLabelEn}>
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
