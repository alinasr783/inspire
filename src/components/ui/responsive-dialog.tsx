"use client";

import { Drawer } from "vaul";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * Renders a centered modal on desktop and a Vaul drawer (bottom sheet with
 * drag-to-dismiss) on mobile.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  className,
  contentClassName,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Applied to the mobile drawer surface. */
  className?: string;
  /** Applied to the centered desktop dialog surface. */
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    if (!open) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={() => onOpenChange(false)}
      >
        <div
          className={cn(
            "relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-6 shadow-lg",
            contentClassName
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      modal
      dismissible
      noBodyStyles
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-border bg-card shadow-lg outline-none",
            className
          )}
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <Drawer.Handle className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
