"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "@/i18n/navigation";
import { createRealtimeClient, type CursorPayload } from "@/lib/supabase/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";

const BROADCAST_CHANNEL = "broadcast:inspire";
const THROTTLE_MS = 50;

export type RemoteCursor = CursorPayload;

export function useCursorBroadcast(
  user: {
    id: string;
    firstName?: string;
    secondName?: string;
    color: string;
    avatarUrl?: string | null;
  } | null,
  onCursorsUpdate: (cursors: RemoteCursor[]) => void
) {
  const cursorsRef = useRef<Map<string, RemoteCursor>>(new Map());
  const lastSendRef = useRef(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pathname = usePathname();
  const onCursorsUpdateRef = useRef(onCursorsUpdate);
  useEffect(() => {
    onCursorsUpdateRef.current = onCursorsUpdate;
  });

  const updateCursors = useCallback(() => {
    onCursorsUpdateRef.current(Array.from(cursorsRef.current.values()));
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createRealtimeClient();

    const channel = supabase.channel(BROADCAST_CHANNEL, {
      config: {
        broadcast: { self: false },
      },
    });

    channelRef.current = channel;

    channel.on(
      "broadcast" as never,
      { event: "cursor" },
      (payload: { payload: RemoteCursor }) => {
        const cursor = payload.payload;
        cursorsRef.current.set(cursor.userId, cursor);
        updateCursors();
      }
    );

    channel.subscribe();

    const cursorCleanup = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, cursor] of cursorsRef.current.entries()) {
        if (now - cursor.ts > 5000) {
          cursorsRef.current.delete(id);
          changed = true;
        }
      }
      if (changed) updateCursors();
    }, 2000);

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSendRef.current < THROTTLE_MS) return;
      lastSendRef.current = now;

      const payload: RemoteCursor = {
        userId: user.id,
        userName: `${user.firstName ?? ""} ${user.secondName ?? ""}`.trim(),
        firstName: user.firstName ?? "",
        userColor: user.color,
        avatarUrl: user.avatarUrl ?? null,
        x: e.clientX,
        y: e.clientY,
        sx: window.scrollX,
        sy: window.scrollY,
        vw: window.innerWidth,
        vh: window.innerHeight,
        page: pathname,
        ts: now,
      };

      channel.send({
        type: "broadcast",
        event: "cursor",
        payload,
      });
    };

    const handleVisibility = () => {
      if (document.hidden) {
        document.removeEventListener("mousemove", handleMouseMove);
      } else {
        document.addEventListener("mousemove", handleMouseMove);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(cursorCleanup);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, user?.firstName, user?.secondName, user?.avatarUrl, user?.color, pathname]);
}
