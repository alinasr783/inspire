"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
  if (!open) return null;

  return (
    <>
      {/* Desktop: centered dialog */}
      <div className="hidden sm:block">
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
      </div>

      {/* Mobile: bottom sheet */}
      <div className="sm:hidden">
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
        <div
          className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom rounded-t-2xl border-t border-border bg-card px-4 pb-8 pt-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">{title}</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>

          {description && (
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}

          <div className="flex gap-3">
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
        </div>
      </div>
    </>
  );
}

export { ConfirmDialog };
