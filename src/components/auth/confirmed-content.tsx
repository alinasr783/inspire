"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, MailCheck, Loader2 } from "lucide-react";
import { resendConfirmationEmail } from "@/lib/auth-actions";

export function ConfirmedContent({
  sent,
  email,
}: {
  sent: boolean;
  email: string;
}) {
  const t = useTranslations("Auth");

  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [resendStatus, setResendStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!sent) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sent]);

  const handleResend = () => {
    if (!canResend || isPending || !email) return;
    startTransition(async () => {
      const result = await resendConfirmationEmail(email);
      if (result.success) {
        setResendStatus("success");
        setCanResend(false);
        setCountdown(30);
        setTimeout(() => setResendStatus("idle"), 3000);
      } else {
        setResendStatus("error");
        setTimeout(() => setResendStatus("idle"), 3000);
      }
    });
  };

  const steps = [
    { label: t("steps.step1"), active: true },
    { label: t("steps.step2"), active: sent },
    { label: t("steps.step3"), active: !sent },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        {sent ? (
          <MailCheck className="h-14 w-14 text-primary" />
        ) : (
          <CheckCircle2 className="h-14 w-14 text-primary" />
        )}

        <div className="space-y-1">
          <h1 className="text-xl font-semibold">
            {sent ? t("checkEmail") : t("confirmedTitle")}
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            {sent ? t("sentSubtitle") : t("confirmedSubtitle")}
          </p>
        </div>

        <div className="flex w-full items-center justify-center gap-1 pt-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                  step.active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.active ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`hidden text-[11px] sm:inline ${
                  step.active ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div className="mx-1 h-px w-6 bg-border" />
              )}
            </div>
          ))}
        </div>

        {sent && (
          <div className="w-full space-y-3 pt-2">
            {canResend ? (
              <Button
                onClick={handleResend}
                disabled={isPending}
                variant="outline"
                className="w-full"
              >
                {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("resendAvailable")}
              </Button>
            ) : (
              <Button disabled variant="outline" className="w-full">
                {t("resendIn", { seconds: countdown })}
              </Button>
            )}
            {resendStatus === "success" && (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                {t("resendSuccess")}
              </p>
            )}
            {resendStatus === "error" && (
              <p className="text-sm text-destructive font-medium">
                {t("resendFailed")}
              </p>
            )}
          </div>
        )}

        <Button render={<Link href="/auth/login" />} variant="secondary">
          {t("goToLogin")}
        </Button>
      </CardContent>
    </Card>
  );
}
