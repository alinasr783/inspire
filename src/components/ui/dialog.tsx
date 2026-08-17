"use client";

import { createContext, useContext } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Drawer } from "vaul";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const MobileDialogContext = createContext(false);

function Dialog({ open, onOpenChange, defaultOpen, children, ...props }: DialogPrimitive.Root.Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileDialogContext.Provider value={true}>
        <Drawer.Root
          open={open}
          onOpenChange={onOpenChange as ((open: boolean) => void) | undefined}
          defaultOpen={defaultOpen}
          modal
          dismissible
          noBodyStyles
        >
          {children as React.ReactNode}
        </Drawer.Root>
      </MobileDialogContext.Provider>
    );
  }

  return (
    <MobileDialogContext.Provider value={false}>
      <DialogPrimitive.Root
        data-slot="dialog"
        open={open}
        onOpenChange={onOpenChange}
        defaultOpen={defaultOpen}
        {...props}
      >
        {children}
      </DialogPrimitive.Root>
    </MobileDialogContext.Provider>
  );
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  const isMobile = useContext(MobileDialogContext);
  if (isMobile) {
    const { render, children, ...rest } = props as DialogPrimitive.Trigger.Props & {
      render?: unknown;
    };
    void render;
    return (
      <Drawer.Trigger {...(rest as object)}>{children}</Drawer.Trigger>
    );
  }
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  const isMobile = useContext(MobileDialogContext);
  if (isMobile) {
    const { render, children, ...rest } = props as DialogPrimitive.Close.Props & {
      render?: unknown;
    };
    void render;
    return <Drawer.Close {...(rest as object)}>{children}</Drawer.Close>;
  }
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  const isMobile = useContext(MobileDialogContext);
  if (isMobile) {
    return <Drawer.Portal {...(props as object)} />;
  }
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  const isMobile = useContext(MobileDialogContext);

  if (isMobile) {
    return (
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
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-1">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    );
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className="fixed inset-0 z-50 bg-black/50 transition-all duration-200 data-closed:opacity-0 data-open:opacity-100 data-open:fade-in-0"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed start-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-4 sm:p-6 shadow-lg transition-all duration-200 data-closed:scale-95 data-closed:opacity-0 data-open:scale-100 data-open:opacity-100 data-open:fade-in-0 data-open:zoom-in-95 max-h-[calc(100vh-2rem)] overflow-y-auto",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 mb-4", className)} {...props} />
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const isMobile = useContext(MobileDialogContext);
  if (isMobile) {
    return <Drawer.Title className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />;
  }
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const isMobile = useContext(MobileDialogContext);
  if (isMobile) {
    return <Drawer.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
  }
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export { Dialog, DialogTrigger, DialogClose, DialogPortal, DialogContent, DialogHeader, DialogTitle, DialogDescription }
