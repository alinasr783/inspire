"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

export function DistinguishedInfo({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="inline-flex cursor-help text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(true)}
      >
        <Info className="size-3.5" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg animate-in slide-in-from-bottom rounded-t-2xl border border-border bg-card p-6 shadow-xl sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:slide-in-from-bottom-4">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ms-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {text}
            </div>
          </div>
        </>
      )}
    </>
  );
}
