"use client";

import { useEffect, useRef, useCallback } from "react";

export function useTableCellKeyboard<T extends { id: string }>(rows: T[]) {
  const hoveredRef = useRef<{ rowId: string; colKey: string } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function handleMouseOver(e: MouseEvent) {
      let el = e.target as HTMLElement | null;
      while (el) {
        const rowId = el.getAttribute("data-row-id");
        const colKey = el.getAttribute("data-col-key");
        if (rowId && colKey) { hoveredRef.current = { rowId, colKey }; return; }
        el = el.parentElement;
      }
    }
    document.addEventListener("mouseover", handleMouseOver);
    return () => document.removeEventListener("mouseover", handleMouseOver);
  }, []);

  useEffect(() => {
    function startScroll(dir: number) {
      if (scrollInterval.current) clearInterval(scrollInterval.current);
      const el = containerRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * 15, behavior: "auto" });
      scrollInterval.current = setInterval(() => {
        if (el) el.scrollBy({ left: dir * 10, behavior: "auto" });
      }, 25);
    }
    function stopScroll() {
      if (scrollInterval.current) { clearInterval(scrollInterval.current); scrollInterval.current = null; }
    }

    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        startScroll(e.key === "ArrowRight" ? 1 : -1);
      }
      if (e.altKey && e.key === "d") {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") stopScroll();
    }

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyUp);
      stopScroll();
    };
  }, []);

  const ctrlD = useCallback((
    cellSave: (rowId: string, colKey: string, value: string) => void,
    getCellAbove: (rowId: string, colKey: string) => string | null
  ) => {
    const h = hoveredRef.current;
    if (!h) return;
    const val = getCellAbove(h.rowId, h.colKey);
    if (val !== null) cellSave(h.rowId, h.colKey, val);
  }, []);

  return { containerRef, ctrlD };
}
