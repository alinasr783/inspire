"use client";

import { memo } from "react";
import { useCellPresence } from "@/components/providers/cell-presence-provider";
import { useRealtime } from "@/components/providers/realtime-provider";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { CellInfo } from "@/components/realtime/table-cell-context-menu";

function userInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export const PresenceTd = memo(function PresenceTd({
  table, rowId, colKey, children, className, onContextMenu,
}: {
  table: string; rowId: string; colKey: string;
  children: React.ReactNode; className?: string;
  onContextMenu?: (e: React.MouseEvent, info: CellInfo) => void;
}) {
  const { cellPresences, broadcastHover, broadcastLeave } = useCellPresence();
  const { cellEditEvents } = useRealtime();
  const key = `${rowId}:${colKey}`;
  const users = cellPresences.get(key);
  const editEvents = cellEditEvents.filter(
    (e) => e.rowId === rowId && e.field === colKey
  );

  const style = (() => {
    const shadows: string[] = [];
    if (users && users.length > 0) {
      const colors = users.map((u) => u.userColor);
      if (colors.length === 1) shadows.push(`inset 0 0 0 2px ${colors[0]}`);
      else colors.slice(0, 3).forEach((c, i) => shadows.push(`inset 0 0 0 ${2 + i * 2.5}px ${c}`));
    }
    if (editEvents.length > 0) {
      const e = editEvents[editEvents.length - 1];
      shadows.push(`inset 0 0 0 3px ${e.userColor}`);
    }
    if (shadows.length === 0) return undefined;
    return { boxShadow: shadows.join(", ") };
  })();

  const allUsers = users ?? [];
  if (editEvents.length > 0) {
    allUsers.unshift({
      userId: editEvents[0].userId,
      userName: editEvents[0].userName,
      userColor: editEvents[0].userColor,
      table: "",
      rowId: "",
      colKey: "",
      page: "",
      ts: editEvents[0].ts,
    });
  }

  const td = (
    <td className={className} style={style} data-row-id={rowId} data-col-key={colKey}
      onMouseEnter={() => { broadcastHover(table, rowId, colKey); }}
      onMouseLeave={() => { broadcastLeave(table, rowId, colKey); }}
      onContextMenu={(e) => onContextMenu?.(e, { table, rowId, colKey, colLabel: colKey, rowData: null })}
    >{children}
    </td>
  );

  if (!users || users.length === 0) {
    if (editEvents.length === 0) return td;
    return (
      <Tooltip>
        <TooltipTrigger>{td}</TooltipTrigger>
        <TooltipContent side="top" align="center" className="max-w-[260px] p-0">
          <div className="rounded-lg p-3">
            {editEvents.map((e) => (
              <div key={`edit-${e.userId}-${e.ts}`} className="flex items-center gap-2.5 py-1 first:pt-0 last:pb-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: e.userColor }}>
                  {e.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{e.userName}</p>
                  <p className="text-[10px] text-muted-foreground">{e.action === "insert" ? "Added" : e.action === "delete" ? "Deleted" : "Edited"} this cell</p>
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger>{td}</TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-[260px] p-0">
        <div className="rounded-lg p-3">
          {allUsers.map((u) => (
            <div key={u.userId} className="flex items-center gap-2.5 py-1 first:pt-0 last:pb-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: u.userColor }}>
                {userInitials(u.userName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{u.userName}</p>
                <p className="text-[10px] text-muted-foreground">Viewing this cell</p>
              </div>
            </div>
          ))}
          {allUsers.length > 3 && <p className="mt-1 text-[10px] text-muted-foreground">+{allUsers.length - 3} more</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});
