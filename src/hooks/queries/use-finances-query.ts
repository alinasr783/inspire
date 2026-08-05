"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/query-keys";
import { queryFinances } from "@/lib/query-actions";
import type { TimeFilter } from "@/lib/finance-types";

export function useFinancesQuery(timeFilter: TimeFilter = "all") {
  return useQuery({
    queryKey: queryKeys.finances.list(timeFilter),
    queryFn: () => queryFinances(timeFilter),
    staleTime: 30_000,
  });
}

export function prefetchFinances(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.prefetchQuery({
    queryKey: queryKeys.finances.list("all"),
    queryFn: () => queryFinances("all"),
    staleTime: 30_000,
  });
}
