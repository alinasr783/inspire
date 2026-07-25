"use client";

import { useMemo, useEffect, useRef } from "react";
import { CursorSvg } from "@/components/realtime/cursor-svg";
import type { RemoteCursor } from "@/hooks/use-cursor-broadcast";

function CursorItem({ cursor }: { cursor: RemoteCursor }) {
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed z-[9998]"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${cursor.x}px, ${cursor.y}px)`,
        willChange: "transform",
      }}
    >
      <CursorSvg color={cursor.userColor} />
      <div
        className="absolute left-3 top-2.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold leading-tight text-white shadow-sm transition-opacity duration-200"
        style={{ backgroundColor: cursor.userColor }}
      >
        {cursor.userName}
      </div>
    </div>
  );
}

export function CursorsOverlay({ cursors }: { cursors: RemoteCursor[] }) {
  const rendered = useMemo(
    () =>
      cursors.map((c) => <CursorItem key={c.userId} cursor={c} />),
    [cursors]
  );

  return <>{rendered}</>;
}
