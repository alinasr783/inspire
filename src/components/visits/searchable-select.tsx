"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search } from "lucide-react";

interface SearchableSelectProps {
  options: { id: string; label: string; sub?: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  addNewLabel?: string;
  addNewHref?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  addNewLabel,
  addNewHref,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.id === value);

  useEffect(() => {
    setSearch(selectedOption?.label ?? "");
  }, [value, selectedOption]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = search
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          (o.sub ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selectOption = useCallback(
    (id: string) => {
      onChange(id);
      const option = options.find((o) => o.id === id);
      setSearch(option?.label ?? "");
      setOpen(false);
    },
    [onChange, options]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) {
        selectOption(filtered[0].id);
      }
    }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? search : selectedOption?.label ?? ""}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Search className="absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              {emptyText || "No results found"}
            </div>
          ) : (
            filtered.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-start transition-colors hover:bg-muted ${
                  option.id === value ? "bg-muted font-medium" : ""
                }`}
                onClick={() => selectOption(option.id)}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {option.sub && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {option.sub}
                  </span>
                )}
              </button>
            ))
          )}
          {addNewLabel && addNewHref && (
            <a
              href={addNewHref}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-primary hover:bg-muted mt-1 border-t pt-1"
            >
              + {addNewLabel}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
