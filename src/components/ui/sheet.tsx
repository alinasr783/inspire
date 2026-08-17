"use client"

import * as React from "react"
import { createContext, useContext } from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { Drawer } from "vaul"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-media-query"
import { XIcon } from "lucide-react"

const MobileSheetContext = createContext(false)

function Sheet({ open, onOpenChange, defaultOpen, children, ...props }: SheetPrimitive.Root.Props) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <MobileSheetContext.Provider value={true}>
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
      </MobileSheetContext.Provider>
    )
  }

  return (
    <MobileSheetContext.Provider value={false}>
      <SheetPrimitive.Root
        data-slot="sheet"
        open={open}
        onOpenChange={onOpenChange}
        defaultOpen={defaultOpen}
        {...props}
      >
        {children}
      </SheetPrimitive.Root>
    </MobileSheetContext.Provider>
  )
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  const isMobile = useContext(MobileSheetContext)
  if (isMobile) {
    const { render, className, children, ...rest } = props as SheetPrimitive.Trigger.Props & {
      render?: React.ReactElement<{ className?: string }>
    }
    return (
      <Drawer.Trigger
        {...(rest as object)}
        className={cn(
          render ? (render.props as { className?: string }).className : undefined,
          className
        )}
      >
        {children}
      </Drawer.Trigger>
    )
  }
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  const isMobile = useContext(MobileSheetContext)
  if (isMobile) {
    const { render, className, children, ...rest } = props as SheetPrimitive.Close.Props & {
      render?: React.ReactElement<{ className?: string }>
    }
    return (
      <Drawer.Close
        {...(rest as object)}
        className={cn(
          render ? (render.props as { className?: string }).className : undefined,
          className
        )}
      >
        {children}
      </Drawer.Close>
    )
  }
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  const isMobile = useContext(MobileSheetContext)
  if (isMobile) {
    return <Drawer.Portal {...(props as object)} />
  }
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const isMobile = useContext(MobileSheetContext)

  if (isMobile) {
    return (
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
        <Drawer.Content
          data-slot="sheet-content"
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
    )
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 end-3"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const isMobile = useContext(MobileSheetContext)
  if (isMobile) {
    return <Drawer.Title className={cn("font-heading text-base font-medium text-foreground", className)} {...props} />
  }
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const isMobile = useContext(MobileSheetContext)
  if (isMobile) {
    return <Drawer.Description className={cn("text-sm text-muted-foreground", className)} {...props} />
  }
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
