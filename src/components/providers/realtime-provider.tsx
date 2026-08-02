"use client";

import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { toast } from "sonner";
import { getUserColor, getUserInitials } from "@/lib/realtime-user-color";
import { usePresence } from "@/hooks/use-presence";
import { useCursorBroadcast, type RemoteCursor } from "@/hooks/use-cursor-broadcast";
import { createRealtimeClient, type PresenceState, type CellEditPayload } from "@/lib/supabase/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ConnectionState = "connected" | "connecting" | "disconnected";

const CELL_EDIT_CHANNEL = "broadcast:inspire:celledits";

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
    avatarUrl: string | null;
  } | null;
  cellEditEvents: CellEditPayload[];
  notifyCellEdit: (payload: Omit<CellEditPayload, "userId" | "userName" | "userColor" | "initials" | "ts">) => void;
  refreshCurrentUser: (data: { firstName?: string; secondName?: string; avatarUrl?: string | null }) => void;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  onlineUsers: [],
  cursors: [],
  onlineCount: 0,
  connectionState: "connecting",
  currentUser: null,
  cellEditEvents: [],
  notifyCellEdit: () => {},
  refreshCurrentUser: () => {},
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
    avatarUrl?: string | null;
  } | null;
}) {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [cellEditEvents, setCellEditEvents] = useState<CellEditPayload[]>([]);
  const [userData, setUserData] = useState<{
    firstName?: string;
    secondName?: string;
    avatarUrl?: string | null;
  }>({});
  const pathname = usePathname();

  const { onlineUsers, onlineCount } = usePresence(
    user
      ? {
          id: user.id,
          firstName: user.firstName,
          secondName: user.secondName,
          email: user.email,
          role: user.role,
          avatarUrl: userData.avatarUrl !== undefined ? userData.avatarUrl : (user.avatarUrl ?? null),
          page: pathname,
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

    prevIdsRef.current = currentIds;
  }, [onlineUsers, user?.id]);

  useEffect(() => {
    if (!user) { setConnectionState("disconnected"); return; }
    setConnectionState("connecting");
    const timer = setTimeout(() => setConnectionState("connected"), 1500);
    const handleOnline = () => setConnectionState("connected");
    const handleOffline = () => setConnectionState("disconnected");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user?.id]);

  const color = user ? getUserColor(user.id) : "";
  const firstName = userData.firstName ?? user?.firstName ?? "";
  const secondName = userData.secondName ?? user?.secondName ?? "";
  const initials = user ? getUserInitials(firstName, secondName) : "";

  const currentUser = user
    ? {
        id: user.id,
        firstName,
        secondName,
        email: user.email ?? "",
        role: user.role ?? "user",
        color,
        initials,
        avatarUrl: userData.avatarUrl !== undefined ? userData.avatarUrl : (user.avatarUrl ?? null),
      }
    : null;

  const refreshCurrentUser = useCallback(
    (data: { firstName?: string; secondName?: string; avatarUrl?: string | null }) => {
      setUserData((prev) => ({ ...prev, ...data }));
    },
    []
  );

  const handleCursors = useCallback((newCursors: RemoteCursor[]) => {
    setCursors(newCursors);
  }, []);

  useCursorBroadcast(currentUser ? { ...currentUser, color } : null, handleCursors);

  const notifyCellEdit = useCallback(
    (payload: Omit<CellEditPayload, "userId" | "userName" | "userColor" | "initials" | "ts">) => {
      if (!currentUser) return;
      const fullPayload: CellEditPayload = {
        ...payload,
        userId: currentUser.id,
        userName: `${currentUser.firstName} ${currentUser.secondName}`.trim(),
        userColor: currentUser.color,
        initials: currentUser.initials,
        ts: Date.now(),
      };
      const supabase = createRealtimeClient();
      const ch = supabase.channel(CELL_EDIT_CHANNEL);
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          ch.send({ type: "broadcast", event: "cellEdit", payload: fullPayload });
          setTimeout(() => { supabase.removeChannel(ch); }, 500);
        }
      });
    },
    [currentUser]
  );

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createRealtimeClient();
    const ch = supabase.channel(CELL_EDIT_CHANNEL, { config: { broadcast: { self: false } } });
    ch.on("broadcast" as never, { event: "cellEdit" }, (payload: { payload: CellEditPayload }) => {
      const edit = payload.payload;
      setCellEditEvents((prev) => [...prev.slice(-20), edit]);
      setTimeout(() => {
        setCellEditEvents((prev) => prev.filter((e) => e.ts !== edit.ts || e.userId !== edit.userId));
      }, 30000);
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return (
    <RealtimeContext.Provider
      value={{
        onlineUsers,
        cursors,
        onlineCount,
        connectionState,
        currentUser,
        cellEditEvents,
        notifyCellEdit,
        refreshCurrentUser,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
