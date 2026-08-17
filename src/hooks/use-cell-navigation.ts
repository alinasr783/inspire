"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface NavigableColumn {
  key: string;
}

export function useCellNavigation<T extends { id: string }>(
  rows: T[],
  columns: NavigableColumn[],
  onEditCell?: (rowId: string, colKey: string) => void,
) {
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [activeColKey, setActiveColKey] = useState<string | null>(null);
  const activeRowRef = useRef<string | null>(null);
  const activeColRef = useRef<string | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const onEditRef = useRef(onEditCell);
  onEditRef.current = onEditCell;

  useEffect(() => {
    if (rows.length > 0) {
      const exists = activeRowRef.current && rows.find((r) => r.id === activeRowRef.current);
      if (!exists) {
        const firstId = rows[0].id;
        activeRowRef.current = firstId;
        setActiveRowId(firstId);
      }
    }
    if (!activeColRef.current || !columns.some((c) => c.key === activeColRef.current)) {
      const firstCol = columns[0]?.key ?? null;
      activeColRef.current = firstCol;
      setActiveColKey(firstCol);
    }
  }, [rows, columns]);

  const handleRowMouseEnter = useCallback((uid: string) => {
    activeRowRef.current = uid;
    setActiveRowId(uid);
  }, []);

  const handleCellMouseEnter = useCallback((uid: string, colKey: string) => {
    activeRowRef.current = uid;
    setActiveRowId(uid);
    activeColRef.current = colKey;
    setActiveColKey(colKey);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isNav = e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight";
      const isEnter = e.key === "Enter";
      if (!isNav && !isEnter) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const rowsData = rowsRef.current;
      if (rowsData.length === 0) return;
      e.preventDefault();

      const cols = columnsRef.current;
      const currentRow = activeRowRef.current;
      const currentCol = activeColRef.current;
      const rowIdx = currentRow ? rowsData.findIndex((r) => r.id === currentRow) : -1;
      const colIdx = currentCol ? cols.findIndex((c) => c.key === currentCol) : -1;

      if (isEnter) {
        if (currentRow && currentCol && colIdx >= 0) {
          onEditRef.current?.(currentRow, currentCol);
        }
        return;
      }

      const isRtl = document.documentElement.dir === "rtl";

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const nextRowIdx = e.key === "ArrowUp"
          ? Math.max(0, rowIdx <= 0 ? 0 : rowIdx - 1)
          : Math.min(rowsData.length - 1, rowIdx < 0 ? 0 : rowIdx + 1);
        const nextId = rowsData[nextRowIdx]?.id;
        if (nextId && nextId !== currentRow) {
          activeRowRef.current = nextId;
          setActiveRowId(nextId);
          const el = document.querySelector(`tr[data-row-id="${nextId}"]`);
          if (el) el.scrollIntoView({ block: "nearest", behavior: "auto" });
        }
      } else {
        if (colIdx < 0) return;
        const isPrev = isRtl ? e.key === "ArrowRight" : e.key === "ArrowLeft";
        const nextColIdx = isPrev
          ? Math.max(0, colIdx - 1)
          : Math.min(cols.length - 1, colIdx + 1);
        const nextCol = cols[nextColIdx]?.key;
        if (nextCol && nextCol !== currentCol) {
          activeColRef.current = nextCol;
          setActiveColKey(nextCol);
          const rowEl = document.querySelector(`tr[data-row-id="${currentRow}"]`);
          const cellEl = rowEl?.querySelector(`td[data-col-key="${nextCol}"]`);
          if (cellEl) cellEl.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return { activeRowId, activeColKey, handleRowMouseEnter, handleCellMouseEnter };
}
