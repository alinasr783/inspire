"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-between">
            <DialogClose
              className="ms-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogClose>
          </div>
          <div className="max-h-[70vh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {text}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
