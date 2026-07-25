"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { RealtimePostgresChangesPayload, RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeSync<T extends Record<string, unknown>>(
  table: string,
  options?: {
    filter?: string;
    event?: "INSERT" | "UPDATE" | "DELETE" | "*";
    schema?: string;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const dataRef = useRef<T[]>([]);

  useEffect(() => {
    const supabase = createRealtimeClient();
    const schema = options?.schema ?? "public";
    const event = options?.event ?? "*";

    const channel = supabase.channel(`realtime:${schema}:${table}`);
    channelRef.current = channel;

    channel.on(
      "postgres_changes" as never,
      {
        event,
        schema,
        table,
        ...(options?.filter ? { filter: options.filter } : {}),
      },
      (payload: RealtimePostgresChangesPayload<T>) => {
        const current = dataRef.current;
        const eventType = payload.eventType;

        if (eventType === "INSERT" && payload.new && "id" in payload.new) {
          const newItem = { ...payload.new } as T;
          dataRef.current = [newItem, ...current];
        } else if (eventType === "UPDATE" && payload.new && "id" in payload.new) {
          const recordId = payload.new.id as string;
          dataRef.current = current.map((item) =>
            (item as Record<string, unknown>).id === recordId
              ? { ...item, ...payload.new } as T
              : item
          );
        } else if (eventType === "DELETE" && payload.old && "id" in payload.old) {
          const recordId = payload.old.id as string;
          dataRef.current = current.filter(
            (item) => (item as Record<string, unknown>).id !== recordId
          );
        }

        setData([...dataRef.current]);
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [table, options?.filter, options?.event, options?.schema]);

  const setInitialData = useCallback((initial: T[]) => {
    dataRef.current = initial;
    setData(initial);
  }, []);

  return { data, setInitialData };
}
