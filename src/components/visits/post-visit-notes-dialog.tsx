"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

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

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(notes);
    setSaving(false);
    onOpenChange(false);
    setNotes("");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl border bg-card p-6 shadow-lg sm:mx-4 animate-in slide-in-from-bottom sm:slide-in-from-bottom-4 sm:zoom-in-95 sm:fade-in">
        <h2 className="text-lg font-semibold leading-none tracking-tight">
          {t("postVisitNotesTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("postVisitNotesDesc")}
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          className="mt-4 flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder={t("postVisitNotesPlaceholder")}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("skip")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
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
      </div>
    </div>
  );
}
