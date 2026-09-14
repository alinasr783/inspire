"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Check, X } from "lucide-react";

interface CellOptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: string[];
  multi: boolean;
  initialValue: string | string[];
  invalidValue?: string | string[] | null;
  onSave: (value: string | string[]) => void;
}

/**
 * Strict option picker: the user can ONLY pick from `options`.
 * No free-text input is ever saved — the search box only filters.
 * Invalid legacy values are kept visible with a warning but cannot be re-saved.
 */
export function CellOptionModal({
  open,
  onOpenChange,
  title,
  options,
  multi,
  initialValue,
  invalidValue,
  onSave,
}: CellOptionModalProps) {
  const [search, setSearch] = useState("");
  const [single, setSingle] = useState<string>(
    typeof initialValue === "string" ? initialValue : ""
  );
  const [multiple, setMultiple] = useState<string[]>(
    Array.isArray(initialValue) ? initialValue : []
  );

  useEffect(() => {
    if (open) {
      setSearch("");
      setSingle(typeof initialValue === "string" ? initialValue : "");
      setMultiple(Array.isArray(initialValue) ? [...initialValue] : []);
    }
  }, [open, initialValue]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.toLowerCase().includes(term));
  }, [options, search]);

  const toggleMulti = (opt: string) => {
    setMultiple((prev) =>
      prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]
    );
  };

  const handleSave = () => {
    onSave(multi ? [...multiple] : single);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="ps-9"
          />
        </div>

        {invalidValue && (typeof invalidValue === "string" ? invalidValue : invalidValue.length > 0) && (
          <p className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            القيمة الحالية ({Array.isArray(invalidValue) ? invalidValue.join("، ") : invalidValue}) غير موجودة في الاختيارات. اختر قيمة صحيحة للحفظ.
          </p>
        )}

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto py-1">
          {multi && (
            <button
              type="button"
              onClick={() => setMultiple([])}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted/60"
            >
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded border border-input">
                {multiple.length === 0 && <Check className="h-3 w-3 text-primary" />}
              </span>
              (بدون اختيار)
            </button>
          )}
          {!multi && (
            <button
              type="button"
              onClick={() => setSingle("")}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-muted/60 ${
                single === "" ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border ${
                  single === "" ? "border-primary" : "border-input"
                }`}
              >
                {single === "" && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              (بدون اختيار)
            </button>
          )}
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              لا توجد اختيارات مطابقة — لا يمكن إضافة قيمة جديدة
            </p>
          )}
          {filtered.map((opt) =>
            multi ? (
              <button
                key={opt}
                type="button"
                onClick={() => toggleMulti(opt)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-muted/60 ${
                  multiple.includes(opt) ? "bg-primary/10 font-medium text-primary" : ""
                }`}
              >
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded border ${
                    multiple.includes(opt) ? "border-primary bg-primary text-primary-foreground" : "border-input"
                  }`}
                >
                  {multiple.includes(opt) && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1 text-start">{opt}</span>
              </button>
            ) : (
              <button
                key={opt}
                type="button"
                onClick={() => setSingle(opt)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-muted/60 ${
                  single === opt ? "bg-primary/10 font-medium text-primary" : ""
                }`}
              >
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border ${
                    single === opt ? "border-primary" : "border-input"
                  }`}
                >
                  {single === opt && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="flex-1 text-start">{opt}</span>
              </button>
            )
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-1">
            <X className="h-3.5 w-3.5" />
            إلغاء
          </Button>
          <Button onClick={handleSave} className="gap-1">
            <Check className="h-3.5 w-3.5" />
            حفظ{multi && multiple.length > 0 ? ` (${multiple.length})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
