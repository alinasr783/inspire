"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "@/i18n/navigation";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type PagePresence = {
  userId: string;
  userName: string;
  userColor: string;
  page: string;
  ts: number;
};

const CHANNEL = "broadcast:inspire_pages";
const STALE_MS = 12000;
const SEND_INTERVAL_MS = 4000;

export function usePagePresence(
  user: { id: string; firstName?: string; secondName?: string; color: string } | null
) {
  const pathname = usePathname();
  const pagesRef = useRef<Map<string, PagePresence>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [pages, setPages] = useState<Map<string, PagePresence>>(new Map());

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createRealtimeClient();
    const channel = supabase.channel(CHANNEL, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on("broadcast" as never, { event: "page" }, (payload: { payload: PagePresence }) => {
      const p = payload.payload;
      pagesRef.current.set(p.userId, p);
      setPages(new Map(pagesRef.current));
    });

    channel.subscribe();

    const send = () => {
      channel.send({
        type: "broadcast",
        event: "page",
        payload: {
          userId: user.id,
          userName: `${user.firstName ?? ""} ${user.secondName ?? ""}`.trim(),
          userColor: user.color,
          page: pathname,
          ts: Date.now(),
        },
      });
    };

    send();
    const interval = setInterval(send, SEND_INTERVAL_MS);

    const cleanup = setInterval(() => {
      let changed = false;
      const now = Date.now();
      for (const [id, p] of pagesRef.current.entries()) {
        if (now - p.ts > STALE_MS) {
          pagesRef.current.delete(id);
          changed = true;
        }
      }
      if (changed) setPages(new Map(pagesRef.current));
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(cleanup);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, user?.firstName, user?.secondName, user?.color, pathname]);

  return pages;
}
