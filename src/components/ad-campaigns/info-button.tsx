"use client";

import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

export function InfoButton({
  onClick,
  className,
  label,
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label ?? "info"}
      title={label}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary",
        className
      )}
    >
      <CircleHelp className="size-3.5" />
    </button>
  );
}
