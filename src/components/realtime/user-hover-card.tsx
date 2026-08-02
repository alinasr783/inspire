"use client";

import { useState, useRef, useCallback } from "react";
import type { PresenceState } from "@/lib/supabase/realtime";

export function formatOnlineTime(isoString: string): string {
  const now = Date.now();
  const diffMs = now - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const CARD_W = 248;
const CARD_H = 180;
const GAP = 8;

export function UserHoverCard({ user, children }: { user: PresenceState; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computePosition = useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const rect = t.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const below = rect.bottom + CARD_H + GAP <= vh || rect.top - CARD_H - GAP < 0;
    const top = below ? rect.bottom + GAP : rect.top - CARD_H - GAP;

    const spaceRight = vw - rect.right;
    const spaceLeft = rect.left;
    let left: number;
    if (spaceLeft >= CARD_W) {
      left = Math.max(GAP, (spaceLeft - CARD_W) / 2);
    } else if (spaceRight >= CARD_W) {
      left = rect.right + GAP;
    } else {
      left = Math.max(GAP, vw - CARD_W - GAP);
    }

    setCardStyle({
      position: "fixed",
      zIndex: 10000,
      left: `${left}px`,
      top: `${Math.max(GAP, Math.min(top, vh - CARD_H - GAP))}px`,
      width: `${CARD_W}px`,
    });
  }, []);

  const handleEnter = useCallback(() => {
    if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
    timeoutRef.current = setTimeout(() => {
      computePosition();
      setShow(true);
    }, 200);
  }, [computePosition]);

  const handleLeave = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    hideTimeoutRef.current = setTimeout(() => setShow(false), 150);
  }, []);

  const handleCardEnter = useCallback(() => {
    if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
  }, []);

  const handleCardLeave = useCallback(() => setShow(false), []);

  const roleLabel = user.role === "admin" ? "Admin" : "User";

  return (
    <div ref={triggerRef} className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {show && (
        <div style={cardStyle} onMouseEnter={handleCardEnter} onMouseLeave={handleCardLeave}>
          <div className="animate-in fade-in zoom-in-95 duration-200 rounded-xl border bg-card p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-background overflow-hidden"
                style={{ backgroundColor: user.avatarUrl ? "transparent" : user.color }}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.initials} className="h-full w-full object-cover" />
                ) : (
                  user.initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.firstName} {user.secondName}</p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Role</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: user.role === "admin" ? "#7c3aed" : "#6b7280" }}>
                  {roleLabel}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className="flex items-center gap-1.5 font-medium text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-500" />Online
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
