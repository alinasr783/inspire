"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Clock, XCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PageState = "pending" | "rejected" | "redirecting" | "loading";

type ProfileChange = {
  id: string;
  approval_status: string;
};

export default function PendingPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [state, setState] = useState<PageState>("loading");

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      if (!profile) {
        router.push("/auth/login");
        return;
      }

      if (profile.approval_status === "approved") {
        setState("redirecting");
        router.push("/");
        router.refresh();
        return;
      }

      if (profile.approval_status === "rejected") {
        setState("rejected");
        return;
      }

      setState("pending");

      const channel = supabase.channel("realtime:profile:status");

      channel.on(
        "postgres_changes" as never,
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<ProfileChange>) => {
          if (!mounted) return;
          const newStatus = (payload.new as ProfileChange | undefined)?.approval_status;

          if (newStatus === "approved") {
            setState("redirecting");
            router.push("/");
            router.refresh();
          } else if (newStatus === "rejected") {
            setState("rejected");
          }
        }
      );

      channel.subscribe();
    }

    init();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (state === "loading") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
          <Loader2 className="h-14 w-14 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

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
