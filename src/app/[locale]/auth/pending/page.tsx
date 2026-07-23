"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Clock, XCircle, Loader2 } from "lucide-react";
import { checkMyStatus } from "@/lib/auth-actions";

type PageState = "pending" | "rejected" | "redirecting";

export default function PendingPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [state, setState] = useState<PageState>("pending");
  const pollingRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      try {
        const result = await checkMyStatus();

        if (!mounted) return;

        if (!result.authenticated) {
          router.push("/auth/login");
          return;
        }

        if (result.approval_status === "approved") {
          setState("redirecting");
          router.push("/");
          router.refresh();
          return;
        }

        if (result.approval_status === "rejected") {
          setState("rejected");
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        }
      } catch {
        // Silently retry
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 3000);

    return () => {
      mounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [router]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        {state === "rejected" ? (
          <XCircle className="h-14 w-14 text-destructive" />
        ) : (
          <div className="relative">
            <Clock className="h-14 w-14 text-primary" />
            <span className="absolute -end-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500" />
            </span>
          </div>
        )}

        <div className="space-y-1">
          <h1 className="text-xl font-semibold">
            {state === "rejected" ? t("rejectedTitle") : t("pendingTitle")}
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            {state === "rejected" ? t("rejectedSubtitle") : t("pendingSubtitle")}
          </p>
          {state === "rejected" && (
            <p className="text-xs text-muted-foreground pt-1">
              {t("rejectedContact")}
            </p>
          )}
        </div>

        {state === "pending" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("pendingLive")}</span>
          </div>
        )}

        {state === "redirecting" && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("pendingLive")}</span>
          </div>
        )}

        <Button render={<Link href="/auth/login" />} variant="secondary">
          {t("pendingBack")}
        </Button>
      </CardContent>
    </Card>
  );
}
