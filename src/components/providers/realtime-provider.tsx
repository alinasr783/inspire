"use client";

import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getUserColor, getUserInitials } from "@/lib/realtime-user-color";
import { usePresence } from "@/hooks/use-presence";
import { useCursorBroadcast, type RemoteCursor } from "@/hooks/use-cursor-broadcast";
import type { PresenceState } from "@/lib/supabase/realtime";

type ConnectionState = "connected" | "connecting" | "disconnected";

type RealtimeContextValue = {
  onlineUsers: PresenceState[];
  cursors: RemoteCursor[];
  onlineCount: number;
  connectionState: ConnectionState;
  currentUser: {
    id: string;
    firstName: string;
    secondName: string;
    email: string;
    role: string;
    color: string;
    initials: string;
  } | null;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  onlineUsers: [],
  cursors: [],
  onlineCount: 0,
  connectionState: "connecting",
  currentUser: null,
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    id: string;
    firstName?: string;
    secondName?: string;
    email?: string;
    role?: string;
  } | null;
}) {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const { onlineUsers, onlineCount } = usePresence(
    user
      ? {
          id: user.id,
          firstName: user.firstName,
          secondName: user.secondName,
          email: user.email,
          role: user.role,
        }
      : null
  );

  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(onlineUsers.map((u) => u.userId));
    const prevIds = prevIdsRef.current;

    for (const u of onlineUsers) {
      if (!prevIds.has(u.userId) && u.userId !== user?.id) {
        const name = `${u.firstName} ${u.secondName}`.trim();
        toast(name || u.email, {
          description: "Joined the workspace",
          icon: (
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: u.color }}
            >
              {u.initials}
            </span>
          ),
          duration: 3000,
        });
      }
    }

    for (const id of prevIds) {
      if (!currentIds.has(id) && id !== user?.id) {
        // User left - we could also toast but it might be noisy
      }
    }

    prevIdsRef.current = currentIds;
  }, [onlineUsers, user?.id]);

  useEffect(() => {
    if (!user) {
      setConnectionState("disconnected");
      return;
    }

    setConnectionState("connecting");

    const timer = setTimeout(() => {
      setConnectionState("connected");
    }, 1500);

    const handleOnline = () => {
      setConnectionState("connected");
    };
    const handleOffline = () => {
      setConnectionState("disconnected");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user?.id]);

  const color = user ? getUserColor(user.id) : "";
  const initials = user ? getUserInitials(user.firstName, user.secondName) : "";

  const currentUser = user
    ? {
        id: user.id,
        firstName: user.firstName ?? "",
        secondName: user.secondName ?? "",
        email: user.email ?? "",
        role: user.role ?? "user",
        color,
        initials,
      }
    : null;

  const handleCursors = useCallback((newCursors: RemoteCursor[]) => {
    setCursors(newCursors);
  }, []);

  useCursorBroadcast(
    currentUser ? { ...currentUser, color } : null,
    handleCursors
  );

  return (
    <RealtimeContext.Provider
      value={{
        onlineUsers,
        cursors,
        onlineCount,
        connectionState,
        currentUser,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
