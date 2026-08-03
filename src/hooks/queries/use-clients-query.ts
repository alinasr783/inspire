"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/hooks/queries/query-keys";
import { queryClients } from "@/lib/query-actions";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { ClientRow } from "@/lib/client-actions";

export function useClientsQuery(initialData?: ClientRow[]) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.clients.list(),
    queryFn: queryClients,
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const supabase = createRealtimeClient();
    const channel = supabase
      .channel("clients-query-sync")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "clients" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function prefetchClients(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.clients.list(),
    queryFn: queryClients,
    staleTime: 5 * 60 * 1000,
  });
}
