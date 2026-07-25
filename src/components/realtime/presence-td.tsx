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
  const { cellPresences, broadcastHover, broadcastLeave } = useCellPresence();
  const key = `${rowId}:${colKey}`;
  const users = cellPresences.get(key);

  const style = (() => {
    if (!users || users.length === 0) return undefined;
    const colors = users.map((u) => u.userColor);
    if (colors.length === 1) return { boxShadow: `inset 0 0 0 2px ${colors[0]}` };
    const shadows = colors
      .slice(0, 3)
      .map((c, i) => `inset 0 0 0 ${2 + i * 2.5}px ${c}`);
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

  if (!users || users.length === 0) return td;

  return (
    <Tooltip>
      <TooltipTrigger>{td}</TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-[260px] p-0">
        <div className="rounded-lg p-3">
          {users.map((u) => (
            <div key={u.userId} className="flex items-center gap-2.5 py-1 first:pt-0 last:pb-0">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: u.userColor }}
              >
                {userInitials(u.userName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{u.userName}</p>
                <p className="text-[10px] text-muted-foreground">Viewing this cell</p>
              </div>
            </div>
          ))}
          {users.length > 3 && (
            <p className="mt-1 text-[10px] text-muted-foreground">+{users.length - 3} more</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});
