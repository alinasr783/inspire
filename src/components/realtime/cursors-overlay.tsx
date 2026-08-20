"use client";

import { memo, useEffect, useMemo, useRef, useCallback } from "react";
import { usePathname } from "@/i18n/navigation";
import type { RemoteCursor } from "@/hooks/use-cursor-broadcast";
import { useRealtime } from "@/components/providers/realtime-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getViewportXY(cursor: RemoteCursor) {
  const sx = cursor.sx ?? 0;
  const sy = cursor.sy ?? 0;
  const ratioW = cursor.vw ? window.innerWidth / cursor.vw : 1;
  const ratioH = cursor.vh ? window.innerHeight / cursor.vh : 1;
  const pageX = cursor.x + sx;
  const pageY = cursor.y + sy;
  return {
    x: pageX * ratioW - window.scrollX,
    y: pageY * ratioH - window.scrollY,
  };
}

interface CursorItemProps {
  userId: string;
  avatarUrl: string | null;
  firstName: string;
  userName: string;
  userColor: string;
  register: (userId: string, el: HTMLDivElement | null) => void;
}

const CursorItem = memo(function CursorItem({
  userId,
  avatarUrl,
  firstName,
  userName,
  userColor,
  register,
}: CursorItemProps) {
  const localRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    register(userId, localRef.current);
    return () => register(userId, null);
  }, [userId, register]);

  const initial = (firstName?.[0] ?? userName?.[0] ?? "?").toUpperCase();

  return (
    <div
      ref={localRef}
      className="pointer-events-none fixed left-0 top-0 z-[9998] will-change-transform"
    >
      <Avatar
        className="h-7 w-7 rounded-full border-2 shadow-sm"
        style={{ borderColor: userColor }}
      >
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback
          className="text-[10px] font-semibold text-white"
          style={{ backgroundColor: userColor }}
        >
          {initial}
        </AvatarFallback>
      </Avatar>
      <span
        className="absolute left-7 top-4 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[11px] font-medium leading-none text-white shadow"
        style={{ backgroundColor: userColor }}
      >
        {firstName || userName}
      </span>
    </div>
  );
});

export function CursorsOverlay({ cursors }: { cursors: RemoteCursor[] }) {
  const pathname = usePathname();
  const { onlineUsers } = useRealtime();

  const cursorsRef = useRef(cursors);
  useEffect(() => {
    cursorsRef.current = cursors;
  }, [cursors]);

  const nodeRefs = useRef(new Map<string, HTMLDivElement | null>());
  const register = useCallback((userId: string, el: HTMLDivElement | null) => {
    if (el) nodeRefs.current.set(userId, el);
    else nodeRefs.current.delete(userId);
  }, []);

  const presenceMap = useMemo(() => {
    const m = new Map<string, { avatarUrl: string | null; firstName: string }>();
    for (const u of onlineUsers) {
      m.set(u.userId, { avatarUrl: u.avatarUrl, firstName: u.firstName });
    }
    return m;
  }, [onlineUsers]);

  const ids = useMemo(
    () => cursors.filter((c) => c.page === pathname).map((c) => c.userId),
    [cursors, pathname]
  );

  useEffect(() => {
    if (ids.length === 0) return;
    let raf = 0;
    const loop = () => {
      const list = cursorsRef.current;
      for (const [userId, el] of nodeRefs.current) {
        const cursor = list.find((c) => c.userId === userId && c.page === pathname);
        if (!el || !cursor) continue;
        const { x, y } = getViewportXY(cursor);
        el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ids.length, pathname]);

  const byId = useMemo(() => {
    const m = new Map<string, RemoteCursor>();
    for (const c of cursors) m.set(c.userId, c);
    return m;
  }, [cursors]);

  return (
    <>
      {ids.map((id) => {
        const c = byId.get(id);
        if (!c) return null;
        const presence = presenceMap.get(id);
        const avatarUrl = c.avatarUrl ?? presence?.avatarUrl ?? null;
        const firstName = c.firstName || presence?.firstName || "";
        return (
          <CursorItem
            key={id}
            userId={id}
            avatarUrl={avatarUrl}
            firstName={firstName}
            userName={c.userName}
            userColor={c.userColor}
            register={register}
          />
        );
      })}
    </>
  );
}
