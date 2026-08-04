"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/hooks/queries/query-keys";
import { fetchAdsByEmployee, upsertDailyAd } from "@/lib/ad-tracking-actions";
import { createRealtimeClient } from "@/lib/supabase/realtime";

export function useAdsQuery(employeeId: string, startDate: string, endDate: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...queryKeys.ads.byEmployee(employeeId), startDate, endDate],
    queryFn: () => fetchAdsByEmployee(employeeId, startDate, endDate),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const supabase = createRealtimeClient();
    const channel = supabase
      .channel(`ads-${employeeId}`)
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "daily_ads", filter: `employee_id=eq.${employeeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.ads.byEmployee(employeeId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, queryClient]);

  return query;
}

export function useSaveAdMutation(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryDate, adCount }: { entryDate: string; adCount: number }) =>
      upsertDailyAd(employeeId, entryDate, adCount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ads.byEmployee(employeeId) });
    },
  });
}
