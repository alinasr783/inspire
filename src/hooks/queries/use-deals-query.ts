"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/hooks/queries/query-keys";
import { queryDeals } from "@/lib/query-actions";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { DealRow } from "@/lib/deal-actions";

export function useDealsQuery(initialData?: DealRow[]) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.deals.list(),
    queryFn: queryDeals,
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const supabase = createRealtimeClient();
    const channel = supabase
      .channel("deals-query-sync")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "generated_deals" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function prefetchDeals(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.deals.list(),
    queryFn: queryDeals,
    staleTime: 5 * 60 * 1000,
  });
}
