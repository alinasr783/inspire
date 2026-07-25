"use client";

import { useState, useRef, useCallback } from "react";
import type { PresenceState } from "@/lib/supabase/realtime";

function formatOnlineTime(isoString: string): string {
  const now = Date.now();
  const onlineAt = new Date(isoString).getTime();
  const diffMs = now - onlineAt;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const CARD_HEIGHT = 170;

export function UserHoverCard({ user, children }: { user: PresenceState; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, below: false });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback((e: React.MouseEvent) => {
    if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const hasSpaceAbove = rect.top > CARD_HEIGHT + 20;
    const cardW = 240;
    let x = rect.left + rect.width / 2;
    x = Math.max(cardW / 2, Math.min(x, window.innerWidth - cardW / 2));
    setCoords({
      x,
      y: hasSpaceAbove ? rect.top - 8 : rect.bottom + 8,
      below: !hasSpaceAbove,
    });
    timeoutRef.current = setTimeout(() => setShow(true), 200);
  }, []);

  const handleLeave = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    hideTimeoutRef.current = setTimeout(() => setShow(false), 150);
  }, []);

  const handleCardEnter = useCallback(() => {
    if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
  }, []);

  const handleCardLeave = useCallback(() => {
    setShow(false);
  }, []);

  const roleLabel = user.role === "admin" ? "Admin" : "User";

  return (
    <div className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}

      {show && (
        <div
          className="fixed z-[10000]"
          style={{
            left: coords.x,
            top: coords.y,
            transform: `translate(-50%, ${coords.below ? "0" : "-100%"})`,
          }}
          onMouseEnter={handleCardEnter}
          onMouseLeave={handleCardLeave}
        >
          <div
            className="animate-in fade-in zoom-in-95 duration-200 rounded-xl border bg-card p-4 shadow-xl"
            style={{ minWidth: 220, transformOrigin: coords.below ? "top center" : "bottom center" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-background"
                style={{ backgroundColor: user.color }}
              >
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {user.firstName} {user.secondName}
                </p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 border-t pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Role</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: user.role === "admin" ? "#7c3aed" : "#6b7280" }}
                >
                  {roleLabel}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className="flex items-center gap-1.5 font-medium text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Active</span>
                <span className="text-muted-foreground">{formatOnlineTime(user.onlineAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
