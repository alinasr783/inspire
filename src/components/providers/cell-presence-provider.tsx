"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRealtime } from "@/components/providers/realtime-provider";
import { useCellBroadcast, type CellPresence } from "@/hooks/use-cell-broadcast";

export type { CellPresence };

type CellPresenceMap = Map<string, CellPresence[]>;

const CellPresenceContext = createContext<{
  cellPresences: CellPresenceMap;
  broadcastHover: (table: string, rowId: string, colKey: string) => void;
  broadcastLeave: (table: string, rowId: string, colKey: string) => void;
}>({
  cellPresences: new Map(),
  broadcastHover: () => {},
  broadcastLeave: () => {},
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

  return (
    <CellPresenceContext.Provider value={{ cellPresences, broadcastHover, broadcastLeave }}>
      {children}
    </CellPresenceContext.Provider>
  );
}
