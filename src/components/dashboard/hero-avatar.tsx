"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";

export function HeroAvatar({
  avatarUrl,
  initials,
  className,
}: {
  avatarUrl: string | null;
  initials: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Avatar
        className={`cursor-pointer ${className ?? ""}`}
        onClick={() => avatarUrl && setOpen(true)}
      >
        <AvatarImage src={avatarUrl ?? undefined} />
        <AvatarFallback className="rounded-2xl bg-primary text-base font-semibold text-primary-foreground sm:text-lg">
          {initials || "IN"}
        </AvatarFallback>
      </Avatar>

      {open && avatarUrl && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/80"
            onClick={() => setOpen(false)}
          />
          <button
            type="button"
            className="fixed top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
          </button>
          <img
            src={avatarUrl}
            alt="Profile"
            className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] max-w-[85vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </>
      )}
    </>
  );
}
