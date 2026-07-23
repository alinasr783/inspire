"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { addDropdownOption } from "@/lib/client-dropdown-actions";
import { Plus } from "lucide-react";

interface DynamicSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  category: string;
}

export function DynamicSelect({
  options,
  value,
  onChange,
  placeholder,
  category,
}: DynamicSelectProps) {
  const t = useTranslations("Clients");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [localOptions, setLocalOptions] = useState(options);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  useEffect(() => {
    setSearch(value);
  }, [value]);

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
    ? localOptions.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : localOptions;

  const isNew = search && !localOptions.some((o) => o.toLowerCase() === search.toLowerCase());

  const selectOption = useCallback(
    (val: string) => {
      onChange(val);
      setSearch(val);
      setOpen(false);
    },
    [onChange]
  );

  const handleAddNew = async () => {
    if (!search) return;
    const result = await addDropdownOption(category, search);
    if (result.success) {
      setLocalOptions((prev) => [...prev, search].sort());
      selectOption(search);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isNew) {
        handleAddNew();
      } else if (filtered.length > 0) {
        selectOption(filtered[0]);
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-input bg-popover p-1 shadow-md">
          {filtered.length === 0 && !isNew && (
            <p className="px-2 py-1 text-xs text-muted-foreground">—</p>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => selectOption(opt)}
              className={`w-full rounded-sm px-2 py-1 text-left text-sm hover:bg-accent ${
                opt === value ? "bg-accent font-medium" : ""
              }`}
            >
              {opt}
            </button>
          ))}
          {isNew && (
            <button
              type="button"
              onClick={handleAddNew}
              className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left text-sm text-primary hover:bg-accent"
            >
              <Plus className="h-3 w-3" />
              {t("addNewOption", { value: search })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
