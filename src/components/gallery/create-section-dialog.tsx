"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createGallerySection } from "@/lib/gallery-actions";
import type { GallerySectionRow } from "@/lib/gallery-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogClose, DialogPortal, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface CreateSectionDialogProps {
  unitId: string;
  onCreated: (section: GallerySectionRow) => void;
}

export function CreateSectionDialog({ unitId, onCreated }: CreateSectionDialogProps) {
  const t = useTranslations("Properties");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    const result = await createGallerySection(unitId, trimmed);

    if (result.success && result.section) {
      onCreated(result.section);
      setName("");
      setOpen(false);
      toast.success(t("sectionCreated") ?? "Section created");
    } else {
      toast.error(result.error ?? "Failed to create section");
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="size-4" />
            {t("createSection") ?? "Create Section"}
          </Button>
        }
      />
      <DialogPortal>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createSection") ?? "Create Section"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sectionName">{t("sectionName") ?? "Section Name"}</Label>
              <Input
                id="sectionName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("sectionNamePlaceholder") ?? "Enter section name..."}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button variant="outline" disabled={loading} />}>
                {t("cancel")}
              </DialogClose>
              <Button onClick={handleCreate} disabled={loading || !name.trim()}>
                {loading ? t("creating") ?? "Creating..." : t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
