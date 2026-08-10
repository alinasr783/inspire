"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface UnauthorizedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnauthorizedDialog({ open, onOpenChange }: UnauthorizedDialogProps) {
  const t = useTranslations("Properties");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle>{t("unauthorizedTitle")}</DialogTitle>
          </div>
          <DialogDescription className="pt-3 text-sm leading-relaxed">
            {t("unauthorizedDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>{t("ok")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
