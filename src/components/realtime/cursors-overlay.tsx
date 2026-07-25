"use client";

import { useMemo, useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import type { RemoteCursor } from "@/hooks/use-cursor-broadcast";

function CursorArrow({ color }: { color: string }) {
  return (
    <svg
      width="24"
      height="28"
      viewBox="0 0 24 28"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow"
    >
      <path
        d="M1.84 1.12C2.1 0.92 2.43 0.86 2.73 0.94L3.34 1L10.5 6.5H11L1.5 3C1.2 2.98 0.92 3.1 0.74 3.34C0.56 3.58 0.52 3.88 0.64 4.14L3.5 11.5C3.56 11.66 3.68 11.78 3.84 11.84L11.34 16C11.6 16.14 11.74 16.46 11.66 16.76C11.58 17.06 11.28 17.3 10.96 17.32L6.5 17.5L2.84 24.16C2.64 24.44 2.3 24.58 1.98 24.54C1.66 24.5 1.4 24.26 1.34 23.94L0.04 6.94C0 6.6 0.12 6.28 0.38 6.06L1.84 1.12Z"
        fill={color}
      />
      <path d="M11 6.5L23.2 17.5L17.5 21.6L17 22L5 22.5L11 6.5Z" fill={color} />
    </svg>
  );
}

function CursorItem({ cursor }: { cursor: RemoteCursor }) {
  const ref = useRef<HTMLDivElement>(null);

  const x = (cursor.x / cursor.vw) * window.innerWidth;
  const y = (cursor.y / cursor.vh) * window.innerHeight;

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
        left: x,
        top: y,
        willChange: "left, top",
      }}
    >
      <CursorArrow color={cursor.userColor} />
      <span
        className="absolute left-4 top-2 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[11px] font-medium leading-none text-white"
        style={{ backgroundColor: cursor.userColor }}
      >
        {cursor.userName}
      </span>
    </div>
  );
}

export function CursorsOverlay({ cursors }: { cursors: RemoteCursor[] }) {
  const pathname = usePathname();

  const samePageCursors = useMemo(
    () => cursors.filter((c) => c.page === pathname),
    [cursors, pathname]
  );

  const rendered = useMemo(
    () => samePageCursors.map((c) => <CursorItem key={c.userId} cursor={c} />),
    [samePageCursors]
  );

  return <>{rendered}</>;
}
