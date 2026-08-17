"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Drawer } from "vaul";
import { useIsMobile } from "@/hooks/use-media-query";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
}

function DesktopConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] transition-opacity duration-150"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="fixed start-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 text-card-foreground shadow-lg"
      >
        <h2 className="text-lg font-semibold leading-none tracking-tight">
          {title}
        </h2>

        {description && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>
  );
}

function MobileConfirmDrawer({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      modal
      dismissible
      noBodyStyles
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-2 shadow-xl outline-none">
          <div className="flex justify-center py-2">
            <Drawer.Handle className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between">
            <Drawer.Title className="text-base font-semibold">{title}</Drawer.Title>
            <button
              onClick={() => onOpenChange(false)}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>

          {description && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={variant}
              className="flex-1"
              onClick={onConfirm}
              disabled={loading}
            >
              {confirmLabel}
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function ConfirmDialog(props: ConfirmDialogProps) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileConfirmDrawer {...props} />;
  return <DesktopConfirmDialog {...props} />;
}

export { ConfirmDialog };
