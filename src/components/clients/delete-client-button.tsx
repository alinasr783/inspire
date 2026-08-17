"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteClient } from "@/lib/client-actions";
import { deleteCompanyClient } from "@/lib/company-client-actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2 } from "lucide-react";

export function DeleteClientButton({ clientId, companyMode = false }: { clientId: string; companyMode?: boolean }) {
  const t = useTranslations("Clients");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button type="button" variant="dangerOutline" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        {t("delete")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("delete")}
        description={t("confirmDelete")}
        confirmLabel={pending ? t("deleting") : t("delete")}
        cancelLabel={t("cancel")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          startTransition(() => {
            void (companyMode ? deleteCompanyClient(clientId) : deleteClient(clientId));
          });
        }}
      />
    </>
  );
}
