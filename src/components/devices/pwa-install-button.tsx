"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Download, Share2, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallButton() {
  const t = useTranslations("Devices");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowIOSGuide(true);
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
    } catch {
      // user cancelled or error
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt, isIOS]);

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>{t("appInstalled")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleInstall} size="lg" className="gap-2 font-semibold">
        <Download className="h-5 w-5" />
        {t("installApp")}
      </Button>

      {isIOS && (
        <p className="text-[13px] text-muted-foreground">
          <Share2 className="inline h-3.5 w-3.5 me-1" />
          {t("iosInstallHint")}
        </p>
      )}

      {showIOSGuide && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-2">
          <p className="font-semibold">{t("iosInstallTitle")}</p>
          <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
            <li>{t("iosStep1")}</li>
            <li>{t("iosStep2")}</li>
            <li>{t("iosStep3")}</li>
          </ol>
        </div>
      )}
    </div>
  );
}
