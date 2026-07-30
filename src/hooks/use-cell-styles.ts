"use client";

import { useEffect, useState } from "react";
import { useRealtime } from "@/components/providers/realtime-provider";
import { loadCellStyles, type CellStyle } from "@/lib/cell-style-service";
import { applyElStyle } from "@/components/realtime/table-cell-context-menu";

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
          const info = {
            table: tableName,
            rowId,
            colKey,
            colLabel: colKey,
            rowData: null,
          };
          if (s.text_color) applyElStyle(info, s.element_type, "color", s.text_color);
          if (s.background_color) applyElStyle(info, s.element_type, "backgroundColor", s.background_color);
          if (s.font_size) applyElStyle(info, s.element_type, "fontSize", String(s.font_size));
          if (s.font_weight) applyElStyle(info, s.element_type, "fontWeight", s.font_weight);
          if (s.border_style) applyElStyle(info, s.element_type, "borderStyle", s.border_style);
          if (s.border_color) applyElStyle(info, s.element_type, "borderColor", s.border_color);
          if (s.border_width) applyElStyle(info, s.element_type, "borderWidth", s.border_width);
          if (s.text_align) applyElStyle(info, s.element_type, "textAlign", s.text_align);
          if (s.vertical_align) applyElStyle(info, s.element_type, "verticalAlign", s.vertical_align);
        }
        setLoaded(true);
      })
      .catch(console.error);
  }, [currentUser?.id, tableName, loaded]);
}
