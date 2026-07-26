"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";
import { useRealtime } from "@/components/providers/realtime-provider";
import { useCellBroadcast, type CellPresence } from "@/hooks/use-cell-broadcast";
import { usePagePresence } from "@/hooks/use-page-presence";
import { useActivityBroadcast, type ActivityEvent } from "@/hooks/use-activity-broadcast";

export type { CellPresence, ActivityEvent };

type CellPresenceMap = Map<string, CellPresence[]>;
type EditCellsMap = Map<string, { userId: string; userColor: string; userName: string; ts: number }>;

const CellPresenceContext = createContext<{
  cellPresences: CellPresenceMap;
  editCells: EditCellsMap;
  pagePresences: Map<string, { userId: string; userName: string; userColor: string; page: string; ts: number }>;
  broadcastHover: (table: string, rowId: string, colKey: string) => void;
  broadcastLeave: (table: string, rowId: string, colKey: string) => void;
  broadcastActivity: (a: Omit<ActivityEvent, "userId" | "userName" | "userColor" | "ts">) => void;
}>({
  cellPresences: new Map(),
  editCells: new Map(),
  pagePresences: new Map(),
  broadcastHover: () => {},
  broadcastLeave: () => {},
  broadcastActivity: () => {},
});

export function useCellPresence() {
  return useContext(CellPresenceContext);
}

export function CellPresenceProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useRealtime();
  const [cellPresences, setCellPresences] = useState<CellPresenceMap>(new Map());

  const onCellUpdate = useCallback((presences: CellPresenceMap) => {
    setCellPresences(presences);
  }, []);

  const user = currentUser
    ? {
        id: currentUser.id,
        firstName: currentUser.firstName,
        secondName: currentUser.secondName,
        color: currentUser.color,
      }
    : null;

  const { broadcastHover, broadcastLeave } = useCellBroadcast(user, onCellUpdate);
  const pagePresences = usePagePresence(user);
  const { editCells, broadcastActivity } = useActivityBroadcast(user);

  const wrappedBroadcastActivity = useCallback((a: Omit<ActivityEvent, "userId" | "userName" | "userColor" | "ts">) => {
    broadcastActivity(a);
    // Show local toast for received activities (handled in onActivity)
  }, [broadcastActivity]);

  // Listen for received activities via the same broadcast mechanism
  // Activity toasts are handled inside useActivityBroadcast via the editCells setter
  // We toast here reactively when editCells changes
  // Actually toasts are better handled in the hook itself via the channel listener
  // But there's an issue: the ActivityEvent reception triggers setEditCells which shows the border
  // We need a separate mechanism for toasts

  // We'll handle toasts inside useActivityBroadcast itself
  // Let me modify useActivityBroadcast to call a toast callback

  return (
    <CellPresenceContext.Provider
      value={{
        cellPresences,
        editCells,
        pagePresences,
        broadcastHover,
        broadcastLeave,
        broadcastActivity: wrappedBroadcastActivity,
      }}
    >
      {children}
    </CellPresenceContext.Provider>
  );
}
