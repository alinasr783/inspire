"use client";

import { useEffect, useState } from "react";
import { useRealtime } from "@/components/providers/realtime-provider";
import { loadCellStyles, type CellStyle } from "@/lib/cell-style-service";
import { applyElStyle, ensureSeriousnessHighlightCSS } from "@/components/realtime/table-cell-context-menu";

export function useCellStyles(tableName: string) {
  const { currentUser } = useRealtime();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser?.id || loaded) return;
    loadCellStyles(currentUser.id, tableName)
      .then((styles) => {
        for (const s of styles) {
          let rowId = "";
          let colKey = "";
          if (s.element_type === "row" || s.element_type === "cell") {
            const parts = s.element_key.split(":");
            rowId = parts[0];
            if (parts.length > 1) colKey = parts[1];
          }
          if (s.element_type === "column") colKey = s.element_key;
          if (s.element_type === "table") { rowId = ""; colKey = ""; }
          if (s.element_type === "conditional" && s.element_key === "seriousness_highlight") {
            const threshold = s.font_size || 7;
            const bg = s.background_color || "#fef3c7";
            const txt = s.text_color || "#92400e";
            ensureSeriousnessHighlightCSS(bg, txt);
            setTimeout(() => {
              document.querySelectorAll("tr[data-seriousness]").forEach((el) => {
                const val = Number((el as HTMLElement).getAttribute("data-seriousness") || "0");
                if (!isNaN(val) && val >= threshold) {
                  el.classList.add("inspire-seriousness-highlight");
                }
              });
            }, 200);
            continue;
          }
          const info = {
            table: tableName,
            rowId,
            colKey,
            colLabel: colKey,
            rowData: null,
          };
          if (s.text_color) applyElStyle(info, s.element_type as any, "color", s.text_color);
          if (s.background_color) applyElStyle(info, s.element_type as any, "backgroundColor", s.background_color);
          if (s.font_size) applyElStyle(info, s.element_type as any, "fontSize", String(s.font_size));
          if (s.font_weight) applyElStyle(info, s.element_type as any, "fontWeight", s.font_weight);
          if (s.border_style) applyElStyle(info, s.element_type as any, "borderStyle", s.border_style);
          if (s.border_color) applyElStyle(info, s.element_type as any, "borderColor", s.border_color);
          if (s.border_width) applyElStyle(info, s.element_type as any, "borderWidth", s.border_width);
          if (s.text_align) applyElStyle(info, s.element_type as any, "textAlign", s.text_align);
          if (s.vertical_align) applyElStyle(info, s.element_type as any, "verticalAlign", s.vertical_align);
        }
        setLoaded(true);
      })
      .catch(console.error);
  }, [currentUser?.id, tableName, loaded]);
}
