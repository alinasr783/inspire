"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import type { RemoteCursor } from "@/hooks/use-cursor-broadcast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getViewportXY(cursor: RemoteCursor) {
  const sx = (cursor.sx ?? 0) as number;
  const sy = (cursor.sy ?? 0) as number;
  const ratioW = cursor.vw ? window.innerWidth / cursor.vw : 1;
  const ratioH = cursor.vh ? window.innerHeight / cursor.vh : 1;
  const pageX = cursor.x + sx;
  const pageY = cursor.y + sy;
  return {
    x: pageX * ratioW - window.scrollX,
    y: pageY * ratioH - window.scrollY,
  };
}

function CursorItem({ cursor }: { cursor: RemoteCursor }) {
  const ref = useRef<HTMLDivElement>(null);

  const getPos = () => getViewportXY(cursor);

  const [{ x, y }, setPos] = useState(() => getPos());

  useEffect(() => {
    const tick = () => setPos(getViewportXY(cursor));
    const id = setInterval(tick, 100);
    window.addEventListener("scroll", tick);
    window.addEventListener("resize", tick);
    tick();
    return () => {
      clearInterval(id);
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
    };
  }, [cursor]);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    el.style.opacity = "1";
    const fadeTimer = setTimeout(() => {
      const now = Date.now();
      if (now - cursor.ts > 4000) {
        el.style.opacity = "0.3";
        el.style.transition = "opacity 0.6s ease-out";
      }
    }, 4000);
    return () => clearTimeout(fadeTimer);
  }, [cursor.ts]);

  if (x < -50 || y < -50 || x > window.innerWidth + 50 || y > window.innerHeight + 50) {
    return null;
  }

  return (
    <div ref={ref} className="pointer-events-none fixed z-[9998]" style={{ left: x, top: y, willChange: "left, top" }}>
      <Avatar
        className="h-7 w-7 rounded-full border-2 shadow-sm"
        style={{ borderColor: cursor.userColor }}
      >
        {cursor.avatarUrl ? <AvatarImage src={cursor.avatarUrl} alt="" /> : null}
        <AvatarFallback
          className="text-[10px] font-semibold text-white"
          style={{ backgroundColor: cursor.userColor }}
        >
          {(cursor.firstName?.[0] ?? cursor.userName?.[0] ?? "?").toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span
        className="absolute left-7 top-4 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[11px] font-medium leading-none text-white shadow"
        style={{ backgroundColor: cursor.userColor }}
      >
        {cursor.firstName || cursor.userName}
      </span>
    </div>
  );
}

export function CursorsOverlay({ cursors }: { cursors: RemoteCursor[] }) {
  const pathname = usePathname();
  const samePageCursors = useMemo(() => cursors.filter((c) => c.page === pathname), [cursors, pathname]);
  const rendered = useMemo(() => samePageCursors.map((c) => <CursorItem key={c.userId} cursor={c} />), [samePageCursors]);
  return <>{rendered}</>;
}
