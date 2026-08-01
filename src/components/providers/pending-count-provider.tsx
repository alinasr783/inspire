"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type ProfileChange = {
  id: string;
  approval_status: string;
};

const PendingCountContext = createContext(0);

export function usePendingCount() {
  return useContext(PendingCountContext);
}

export function PendingCountProvider({
  children,
  role,
  initialPending,
}: {
  children: React.ReactNode;
  role?: string;
  initialPending: number;
}) {
  const tAdmin = useTranslations("Admin");
  const [count, setCount] = useState(initialPending);
  const prevCountRef = useRef(initialPending);
  const tAdminRef = useRef(tAdmin);

  useEffect(() => {
    tAdminRef.current = tAdmin;
  });

  useEffect(() => {
    if (role !== "admin") return;

    const supabase = createRealtimeClient();
    const channel = supabase.channel("realtime:profiles:pending");

    channel.on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "profiles" },
      (payload: RealtimePostgresChangesPayload<ProfileChange>) => {
        const eventType = payload.eventType;
        const newStatus = (payload.new as ProfileChange | undefined)?.approval_status;
        const oldStatus = (payload.old as Partial<ProfileChange> | undefined)?.approval_status;

        setCount((prev) => {
          let next = prev;
          if (eventType === "INSERT" && newStatus === "pending") next = prev + 1;
          else if (eventType === "UPDATE") {
            if (oldStatus === "pending" && newStatus !== "pending") next = Math.max(0, prev - 1);
            else if (oldStatus !== "pending" && newStatus === "pending") next = prev + 1;
          } else if (eventType === "DELETE" && oldStatus === "pending") next = Math.max(0, prev - 1);

          if (next > prev && prev > 0) {
            toast(tAdminRef.current("newPendingToast", { count: next }), {
              action: {
                label: tAdminRef.current("viewUsers"),
                onClick: () => (window.location.href = "/ar/admin/users"),
              },
              duration: 6000,
            });
          }
          prevCountRef.current = next;
          return next;
        });
      }
    );

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  return (
    <PendingCountContext.Provider value={count}>
      {children}
    </PendingCountContext.Provider>
  );
}
