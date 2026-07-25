"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createRealtimeClient, type PresenceState } from "@/lib/supabase/realtime";
import { getUserColor, getUserInitials } from "@/lib/realtime-user-color";
import type { RealtimePresenceState, RealtimeChannel } from "@supabase/supabase-js";

const CHANNEL_NAME = "presence:inspire";

export function usePresence(user: {
  id: string;
  firstName?: string;
  secondName?: string;
  email?: string;
  role?: string;
} | null) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const trackRef = useRef<PresenceState | null>(null);

  const mergeStates = useCallback((state: RealtimePresenceState<PresenceState>): PresenceState[] => {
    const users: PresenceState[] = [];
    for (const key of Object.keys(state)) {
      const presences = state[key];
      if (presences && presences.length > 0) {
        users.push(presences[0]);
      }
    }
    return users;
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createRealtimeClient();
    const color = getUserColor(user.id);
    const initials = getUserInitials(user.firstName, user.secondName);

    const presenceData: PresenceState = {
      userId: user.id,
      firstName: user.firstName ?? "",
      secondName: user.secondName ?? "",
      email: user.email ?? "",
      role: user.role ?? "user",
      color,
      initials,
      onlineAt: new Date().toISOString(),
    };

    trackRef.current = presenceData;

    const channel = supabase.channel(CHANNEL_NAME, {
      config: {
        presence: { key: user.id },
      },
    });

    channelRef.current = channel;

    channel
      .on("presence" as never, { event: "sync" }, () => {
        const state = channel.presenceState() as RealtimePresenceState<PresenceState>;
        setOnlineUsers(mergeStates(state));
      })
      .on("presence" as never, { event: "join" }, () => {
        const state = channel.presenceState() as RealtimePresenceState<PresenceState>;
        setOnlineUsers(mergeStates(state));
      })
      .on("presence" as never, { event: "leave" }, () => {
        const state = channel.presenceState() as RealtimePresenceState<PresenceState>;
        setOnlineUsers(mergeStates(state));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(presenceData);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, user?.firstName, user?.secondName, user?.email, user?.role, mergeStates]);

  return {
    onlineUsers,
    currentUser: trackRef.current,
    onlineCount: onlineUsers.length,
  };
}
