"use client";

import { memo } from "react";
import { useCellPresence } from "@/components/providers/cell-presence-provider";
import type { CellPresence } from "@/hooks/use-cell-broadcast";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

function userInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const PresenceTd = memo(function PresenceTd({
  table,
  rowId,
  colKey,
  children,
  className,
}: {
  table: string;
  rowId: string;
  colKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { cellPresences, editCells, broadcastHover, broadcastLeave } = useCellPresence();
  const key = `${rowId}:${colKey}`;
  const users = cellPresences.get(key);
  const edit = editCells.get(`${table}:${rowId}:${colKey}`);

  const style = (() => {
    const shadows: string[] = [];
    if (edit) shadows.push(`inset 0 0 0 2px ${edit.userColor}`);
    if (users && users.length > 0) {
      const colors = users.map((u) => u.userColor);
      if (edit) colors.push(edit.userColor);
      if (colors.length === 1) shadows.push(`inset 0 0 0 ${edit ? 4.5 : 2}px ${colors[0]}`);
      else {
        colors.slice(0, 3).forEach((c, i) => {
          shadows.push(`inset 0 0 0 ${2 + i * 2.5}px ${c}`);
        });
      }
    }
    if (shadows.length === 0) return undefined;
    return { boxShadow: shadows.join(", ") };
  })();

  const td = (
    <td
      className={className}
      style={style}
      onMouseEnter={() => broadcastHover(table, rowId, colKey)}
      onMouseLeave={() => broadcastLeave(table, rowId, colKey)}
    >
      {children}
    </td>
  );

  const tooltipUsers: CellPresence[] = users ?? [];
  if (edit && !tooltipUsers.some((u) => u.userId === edit.userId)) {
    tooltipUsers.push({
      userId: edit.userId,
      userName: edit.userName,
      userColor: edit.userColor,
      table,
      rowId,
      colKey,
      page: "",
      ts: edit.ts,
    });
  }

  if (tooltipUsers.length === 0) return td;

  return (
    <Tooltip>
      <TooltipTrigger>{td}</TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-[260px] p-0">
        <div className="rounded-lg p-3">
          {tooltipUsers.map((u) => (
            <div key={u.userId} className="flex items-center gap-2.5 py-1 first:pt-0 last:pb-0">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: u.userColor }}
              >
                {userInitials(u.userName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{u.userName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {u.userId === edit?.userId ? "Edited this cell" : "Viewing this cell"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});
