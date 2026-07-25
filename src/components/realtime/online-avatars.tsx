"use client";

import { useMemo } from "react";
import { UserHoverCard } from "@/components/realtime/user-hover-card";
import type { PresenceState } from "@/lib/supabase/realtime";

export function OnlineAvatars({
  onlineUsers,
  currentUserId,
}: {
  onlineUsers: PresenceState[];
  currentUserId?: string;
}) {
  const { others, count } = useMemo(() => {
    const filtered = onlineUsers.filter((u) => u.userId !== currentUserId);
    return { others: filtered, count: filtered.length };
  }, [onlineUsers, currentUserId]);

  const visible = others.slice(0, 4);
  const overflow = count - 4;

  return (
    <div className="flex items-center gap-0">
      {visible.map((user, idx) => (
        <UserHoverCard key={user.userId} user={user}>
          <div
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-background animate-in fade-in zoom-in"
            style={{
              backgroundColor: user.color,
              zIndex: 10 - idx,
              animationDelay: `${idx * 50}ms`,
            }}
          >
            {user.initials}
            <span className="absolute -bottom-px -right-px flex h-3 w-3 rounded-full border-2 border-background bg-green-500" />
          </div>
        </UserHoverCard>
      ))}

      {overflow > 0 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-2 ring-background animate-in fade-in zoom-in">
          +{overflow}
        </div>
      )}

      {count === 0 && (
        <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
          No one else online
        </div>
      )}

      {count > 0 && (
        <span className="ms-1 text-[11px] font-medium text-muted-foreground">
          {count} online
        </span>
      )}
    </div>
  );
}

