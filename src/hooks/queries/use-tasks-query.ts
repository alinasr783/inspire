"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/hooks/queries/query-keys";
import { queryTasks } from "@/lib/query-actions";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { TaskRow, EmployeeRow } from "@/lib/task-types";

export function useTasksQuery(initialData?: { tasks: TaskRow[]; employees: EmployeeRow[] }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: queryTasks,
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const supabase = createRealtimeClient();
    const channel = supabase
      .channel("tasks-query-sync")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "tasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function prefetchTasks(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: queryTasks,
    staleTime: 5 * 60 * 1000,
  });
}
