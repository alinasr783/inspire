"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth-actions";
import { ShieldAlert, Timer, Infinity, LogOut } from "lucide-react";
import { format } from "date-fns";
import type { BanInfo } from "@/lib/ban-actions";

export function BanScreen({ banInfo }: { banInfo: NonNullable<BanInfo["ban"]> }) {
  const t = useTranslations("Banned");
  const router = useRouter();

  const handleSignOut = async () => {
    await logout();
    router.refresh();
  };

  const untilDate = banInfo.banned_until
    ? format(new Date(banInfo.banned_until), "dd MMMM yyyy")
    : null;

  const bannedAt = format(new Date(banInfo.banned_at), "dd MMMM yyyy");

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {banInfo.reason && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs text-muted-foreground mb-1">{t("reason")}</p>
              <p className="text-sm font-medium">{banInfo.reason}</p>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            {banInfo.ban_type === "permanent" ? (
              <Infinity className="h-5 w-5 text-destructive shrink-0" />
            ) : (
              <Timer className="h-5 w-5 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                {banInfo.ban_type === "permanent" ? t("permanent") : t("temporary")}
              </p>
              {untilDate && (
                <p className="text-xs text-muted-foreground">
                  {t("until")}: {untilDate}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t("bannedSince")}: {bannedAt}
              </p>
            </div>
          </div>

          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            <span className="ms-2">{t("signOut")}</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
