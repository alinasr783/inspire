"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Switch({
  className,
  checked,
  onCheckedChange,
  disabled,
  id,
}: {
  className?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted-foreground/20",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        )}
      />
    </label>
  );
}

export { Switch };
