"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "@/i18n/navigation";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type CellPresence = {
  userId: string;
  userName: string;
  userColor: string;
  table: string;
  rowId: string;
  colKey: string;
  page: string;
  ts: number;
};

const CHANNEL = "broadcast:inspire_cells";
const STALE_MS = 3000;

export function useCellBroadcast(
  user: { id: string; firstName?: string; secondName?: string; color: string } | null,
  onCellUpdate: (presences: Map<string, CellPresence[]>) => void
) {
  const pathname = usePathname();
  const presencesRef = useRef<Map<string, CellPresence[]>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onUpdate = useRef(onCellUpdate);
  onUpdate.current = onCellUpdate;

  const notify = useCallback(() => {
    onUpdate.current(new Map(presencesRef.current));
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createRealtimeClient();
    const channel = supabase.channel(CHANNEL, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on("broadcast" as never, { event: "cell-hover" }, (payload: { payload: CellPresence }) => {
      const p = payload.payload;
      if (p.page !== pathname) return;
      const key = `${p.rowId}:${p.colKey}`;
      const existing = presencesRef.current.get(key) ?? [];
      const filtered = existing.filter((u) => u.userId !== p.userId);
      filtered.push(p);
      presencesRef.current.set(key, filtered);
      notify();
    });

    channel.on("broadcast" as never, { event: "cell-leave" }, (payload: { payload: { userId: string; rowId: string; colKey: string } }) => {
      const p = payload.payload;
      const key = `${p.rowId}:${p.colKey}`;
      const existing = presencesRef.current.get(key);
      if (existing) {
        const filtered = existing.filter((u) => u.userId !== p.userId);
        if (filtered.length === 0) {
          presencesRef.current.delete(key);
        } else {
          presencesRef.current.set(key, filtered);
        }
        notify();
      }
    });

    channel.subscribe();

    const cleanup = setInterval(() => {
      let changed = false;
      const now = Date.now();
      for (const [k, users] of presencesRef.current.entries()) {
        const active = users.filter((u) => now - u.ts < STALE_MS);
        if (active.length !== users.length) {
          changed = true;
          if (active.length === 0) presencesRef.current.delete(k);
          else presencesRef.current.set(k, active);
        }
      }
      if (changed) notify();
    }, 2000);

    return () => {
      clearInterval(cleanup);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, user?.firstName, user?.secondName, user?.color, pathname, notify]);

  const broadcastHover = useCallback((table: string, rowId: string, colKey: string) => {
    if (!user || !channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "cell-hover",
      payload: {
        userId: user.id,
        userName: `${user.firstName ?? ""} ${user.secondName ?? ""}`.trim(),
        userColor: user.color,
        table,
        rowId,
        colKey,
        page: pathname,
        ts: Date.now(),
      },
    });
  }, [user, pathname]);

  const broadcastLeave = useCallback((_table: string, rowId: string, colKey: string) => {
    if (!user || !channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "cell-leave",
      payload: { userId: user.id, rowId, colKey },
    });
  }, [user]);

  return { broadcastHover, broadcastLeave };
}
