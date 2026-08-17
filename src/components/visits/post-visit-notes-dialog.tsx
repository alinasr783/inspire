"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PostVisitNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (notes: string) => Promise<void>;
  defaultValue: string;
}

export function PostVisitNotesDialog({
  open,
  onOpenChange,
  onSave,
  defaultValue,
}: PostVisitNotesDialogProps) {
  const t = useTranslations("Visits");
  const [notes, setNotes] = useState(defaultValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(notes);
    setSaving(false);
    onOpenChange(false);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("postVisitNotesTitle")}</DialogTitle>
          <DialogDescription>{t("postVisitNotesDesc")}</DialogDescription>
        </DialogHeader>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder={t("postVisitNotesPlaceholder")}
          autoFocus
        />
        <div className="mt-2 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("skip")}
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("save")}
              </span>
            ) : (
              t("save")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
