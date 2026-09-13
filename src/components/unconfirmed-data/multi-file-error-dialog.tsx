"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Drawer } from "vaul";
import { useIsMobile } from "@/hooks/use-media-query";

interface MultiFileErrorDialogProps {
  open: boolean;
  fileName: string;
  errorMessage: string;
  remainingCount: number;
  onContinueWithoutFile: (rememberChoice: boolean) => void;
  onStop: () => void;
}

function Content({
  fileName,
  errorMessage,
  remainingCount,
  onContinueWithoutFile,
  onStop,
}: Omit<MultiFileErrorDialogProps, "open">) {
  const t = useTranslations("UnconfirmedData");
  const [remember, setRemember] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{t("fileErrorTitle")}</h3>
          <p className="truncate text-sm text-muted-foreground" title={fileName}>
            {fileName}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        <span className="whitespace-pre-wrap font-mono text-xs">{errorMessage}</span>
      </div>

      {remainingCount > 0 && (
        <p className="mb-4 text-xs text-muted-foreground">
          {t("remainingFiles", { count: remainingCount })}
        </p>
      )}

      <label className="mb-4 flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4"
        />
        {t("rememberChoice")}
      </label>

      <div className="flex items-center gap-3">
        <Button onClick={() => onContinueWithoutFile(remember)} className="flex-1">
          {t("continueWithoutFile")}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onStop}>
          {t("stopUpload")}
        </Button>
      </div>
    </div>
  );
}

export function MultiFileErrorDialog(props: MultiFileErrorDialogProps) {
  const isMobile = useIsMobile();
  const { open } = props;

  if (isMobile) {
    return (
      <Drawer.Root open={open} modal dismissible={false} noBodyStyles>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-card px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-2 shadow-xl outline-none">
            <div className="flex justify-center py-2">
              <Drawer.Handle className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <Drawer.Title className="sr-only">File error</Drawer.Title>
            <Content {...props} />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <Content {...props} />
      </div>
    </div>
  );
}
