"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function UnitFormError({ error }: { error?: string }) {
  const t = useTranslations("Properties");

  useEffect(() => {
    if (!error) return;
    if (error === "validation") {
      toast.error(t("errors.createFailed"));
    } else if (error === "create-failed") {
      toast.error(t("errors.createFailed"));
    }
  }, [error, t]);

  return null;
}
