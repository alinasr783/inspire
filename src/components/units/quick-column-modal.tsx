"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveColumnConfig } from "@/lib/unit-config-actions";
import { UnauthorizedDialog } from "@/components/ui/unauthorized-dialog";
import { showSuccess, showError } from "@/lib/toast-utils";

interface QuickColumnModalProps {
  isAdmin: boolean;
}

export function QuickColumnModal({ isAdmin }: QuickColumnModalProps) {
  const t = useTranslations("Properties");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showUnauthorized, setShowUnauthorized] = useState(false);

  const [formKey, setFormKey] = useState("");
  const [formLabelAr, setFormLabelAr] = useState("");
  const [formLabelEn, setFormLabelEn] = useState("");
  const [formType, setFormType] = useState<"text" | "number" | "date" | "select" | "textarea">("text");
  const [formOptions, setFormOptions] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function handleOpen() {
      if (!isAdmin) {
        setShowUnauthorized(true);
        return;
      }
      setFormKey("");
      setFormLabelAr("");
      setFormLabelEn("");
      setFormType("text");
      setFormOptions("");
      setOpen(true);
    }
    document.addEventListener("inspire:quick-add-column", handleOpen);
    return () => document.removeEventListener("inspire:quick-add-column", handleOpen);
  }, [isAdmin]);

  const handleSave = useCallback(async () => {
    if (!formKey.trim() || !formLabelAr.trim() || !formLabelEn.trim()) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("key", formKey.trim());
    fd.append("label_ar", formLabelAr.trim());
    fd.append("label_en", formLabelEn.trim());
    fd.append("type", formType);
    fd.append("options", formOptions);
    fd.append("sort_order", "999");
    fd.append("enabled", "true");

    const result = await saveColumnConfig(fd);
    setSaving(false);
    if (result.success) {
      showSuccess(t("columnAdded"));
      setOpen(false);
      router.refresh();
    } else {
      showError(t("columnAddFailed"));
    }
  }, [formKey, formLabelAr, formLabelEn, formType, formOptions, t, router]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("quickAddColumn")}</DialogTitle>
            <DialogDescription>{t("quickAddColumnDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("columnKey")}</Label>
              <Input
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g. delivery_date"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("columnLabelAr")}</Label>
              <Input
                value={formLabelAr}
                onChange={(e) => setFormLabelAr(e.target.value)}
                className="h-8 text-xs"
                placeholder="الاسم بالعربية"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("columnLabelEn")}</Label>
              <Input
                value={formLabelEn}
                onChange={(e) => setFormLabelEn(e.target.value)}
                className="h-8 text-xs"
                placeholder="English label"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("columnType")}</Label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as typeof formType)}
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
                  placeholder={t("columnOptionsPlaceholder")}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!formKey.trim() || !formLabelAr.trim() || !formLabelEn.trim() || saving}
            >
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <UnauthorizedDialog open={showUnauthorized} onOpenChange={setShowUnauthorized} />
    </>
  );
}
