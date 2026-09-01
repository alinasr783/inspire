"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LogOut, AlertTriangle } from "lucide-react";
import { useRealtime } from "@/components/providers/realtime-provider";
import { stopImpersonation } from "@/lib/impersonation-actions";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { currentUser } = useRealtime();

  const displayName = currentUser
    ? [currentUser.firstName, currentUser.secondName]
        .filter(Boolean)
        .join(" ") || currentUser.email
    : "";

  const handleStop = () => {
    startTransition(async () => {
      const result = await stopImpersonation();
      if (result.success) {
        toast.success(t("stopImpersonatingSuccess"));
        router.refresh();
        router.push("/");
      } else {
        toast.error(t("stopImpersonatingFailed"));
      }
    });
  };

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-orange-50 px-4 py-2 text-sm text-orange-900 dark:bg-orange-900/20 dark:text-orange-100 border-b border-orange-200 dark:border-orange-800">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>
          {t("impersonatingAs")}{" "}
          <strong className="font-semibold">{displayName}</strong>
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleStop}
        disabled={isPending}
        className="border-orange-300 text-orange-900 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-100 dark:hover:bg-orange-900/30"
      >
        {isPending ? (
          tCommon("loading")
        ) : (
          <>
            <LogOut className="h-3.5 w-3.5" />
            <span className="ms-1">{t("stopImpersonating")}</span>
          </>
        )}
      </Button>
    </div>
  );
}
