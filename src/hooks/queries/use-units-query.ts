"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/hooks/queries/query-keys";
import { queryUnits } from "@/lib/query-actions";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { UnitRow } from "@/lib/unit-actions";

export function useUnitsQuery(initialData?: UnitRow[]) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.units.list(),
    queryFn: queryUnits,
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const supabase = createRealtimeClient();
    const channel = supabase
      .channel("units-query-sync")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "units" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.units.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function prefetchUnits(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.units.list(),
    queryFn: queryUnits,
    staleTime: 5 * 60 * 1000,
  });
}
