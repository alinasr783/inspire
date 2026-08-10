"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/hooks/queries/query-keys";
import { queryDailyWorkLogs } from "@/lib/query-actions";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { DailyWorkLogWithEmployee } from "@/lib/daily-work-log-types";

export function useDailyWorkLogsQuery(
  year: number,
  month: number,
  employeeFilter?: string,
  initialData?: DailyWorkLogWithEmployee[]
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.dailyWorkLogs.byMonth(year, month, employeeFilter),
    queryFn: () => queryDailyWorkLogs(year, month, employeeFilter),
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const supabase = createRealtimeClient();
    const channel = supabase
      .channel("daily-work-logs-query-sync")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "daily_work_logs" },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.dailyWorkLogs.all,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
