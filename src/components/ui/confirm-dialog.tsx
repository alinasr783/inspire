"use client";

import * as React from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop
          className="fixed inset-0 z-50 bg-black/20 sm:backdrop-blur-[2px] transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"
        />
        <AlertDialog.Popup
          className={cn(
            "fixed start-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-4 sm:p-6 text-card-foreground shadow-lg transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 max-h-[75vh] overflow-y-auto overscroll-contain"
          )}
        >
          <AlertDialog.Title className="text-lg font-semibold leading-none tracking-tight">
            {title}
          </AlertDialog.Title>

          {description && (
            <AlertDialog.Description className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {description}
            </AlertDialog.Description>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Close
              render={
                <Button variant="outline" disabled={loading} />
              }
            >
              {cancelLabel}
            </AlertDialog.Close>
            <Button
              variant={variant}
              onClick={onConfirm}
              disabled={loading}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export { ConfirmDialog };
