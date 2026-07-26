"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ActivityEvent = {
  userId: string;
  userName: string;
  userColor: string;
  table: string;
  rowId: string;
  colKey: string;
  action: "edit" | "add" | "delete";
  tableLabel: string;
  ts: number;
};

const CHANNEL = "broadcast:inspire_activity";
const EDIT_BORDER_MS = 30000;

export function useActivityBroadcast(
  user: { id: string; firstName?: string; secondName?: string; color: string } | null
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [editCells, setEditCells] = useState<Map<string, { userId: string; userColor: string; userName: string; ts: number }>>(new Map());

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createRealtimeClient();
    const channel = supabase.channel(CHANNEL, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on("broadcast" as never, { event: "activity" }, (payload: { payload: ActivityEvent }) => {
      const a = payload.payload;

      // Toast notification
      const actionLabel = a.action === "edit" ? "modified" : a.action === "add" ? "added to" : "deleted from";
      toast(
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: a.userColor }}
          >
            {a.userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
          <span className="text-xs">
            <strong>{a.userName}</strong> {actionLabel} <strong>{a.tableLabel}</strong>
          </span>
        </div>,
        { duration: 4000, position: "bottom-center" }
      );

      // 30s edit border
      if (a.action === "edit") {
        const key = `${a.table}:${a.rowId}:${a.colKey}`;
        setEditCells((prev) => {
          const next = new Map(prev);
          next.set(key, { userId: a.userId, userColor: a.userColor, userName: a.userName, ts: a.ts });
          setTimeout(() => {
            setEditCells((prev2) => {
              const n2 = new Map(prev2);
              const existing = n2.get(key);
              if (existing && existing.ts === a.ts) n2.delete(key);
              return n2;
            });
          }, EDIT_BORDER_MS);
          return next;
        });
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id]);

  const broadcastActivity = useCallback((a: Omit<ActivityEvent, "userId" | "userName" | "userColor" | "ts">) => {
    if (!user || !channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "activity",
      payload: {
        userId: user.id,
        userName: `${user.firstName ?? ""} ${user.secondName ?? ""}`.trim(),
        userColor: user.color,
        table: a.table,
        rowId: a.rowId,
        colKey: a.colKey,
        action: a.action,
        tableLabel: a.tableLabel,
        ts: Date.now(),
      },
    });
  }, [user]);

  return { editCells, broadcastActivity };
}
