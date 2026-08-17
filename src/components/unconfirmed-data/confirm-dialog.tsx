"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { Drawer } from "vaul";
import { useIsMobile } from "@/hooks/use-media-query";

interface ConfirmDialogProps {
  open: boolean;
  totalRows: number;
  totalColumns: number;
  warningsCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function DesktopConfirmDialog({
  open,
  totalRows,
  totalColumns,
  warningsCount,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const t = useTranslations("UnconfirmedData");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t("confirmAdd")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("confirmMessage", { count: totalRows })}
            </p>
          </div>
        </div>

        <div className="mb-4 space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("totalRecords")}</span>
            <span className="font-medium">{totalRows}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("columnsCount")}</span>
            <span className="font-medium">{totalColumns}</span>
          </div>
          {warningsCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                {t("warnings")}
              </span>
              <span className="font-medium text-amber-600 dark:text-amber-400">{warningsCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("processing")}
              </span>
            ) : (
              t("confirmAdd")
            )}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
            {t("backToUploads")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MobileConfirmDrawer({
  open,
  totalRows,
  totalColumns,
  warningsCount,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const t = useTranslations("UnconfirmedData");

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onCancel(); }} modal dismissible noBodyStyles>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-card px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-2 shadow-xl outline-none">
          <div className="flex justify-center py-2">
            <Drawer.Handle className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <Drawer.Title className="text-base font-semibold">{t("confirmAdd")}</Drawer.Title>
              <p className="text-sm text-muted-foreground">
                {t("confirmMessage", { count: totalRows })}
              </p>
            </div>
          </div>

          <div className="mb-4 space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("totalRecords")}</span>
              <span className="font-medium">{totalRows}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("columnsCount")}</span>
              <span className="font-medium">{totalColumns}</span>
            </div>
            {warningsCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  {t("warnings")}
                </span>
                <span className="font-medium text-amber-600 dark:text-amber-400">{warningsCount}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("processing")}
                </span>
              ) : (
                t("confirmAdd")
              )}
            </Button>
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
              {t("backToUploads")}
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileConfirmDrawer {...props} />;
  return <DesktopConfirmDialog {...props} />;
}
