"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteVisit } from "@/lib/visit-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useState } from "react";

export function DeleteVisitButton({ visitId }: { visitId: string }) {
  const t = useTranslations("Visits");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteVisit(visitId);
    setLoading(false);
    if (result.success) {
      toast.success(t("deleteSuccess"));
      router.refresh();
    } else {
      toast.error(t(`errors.${result.error}`));
    }
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("confirmDelete")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        variant="destructive"
        onConfirm={handleDelete}
        loading={loading}
      />
    </>
  );
}
