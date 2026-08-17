"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/hooks/queries/query-keys";
import { queryCompanyClients } from "@/lib/query-actions";
import { createRealtimeClient } from "@/lib/supabase/realtime";
import type { ClientRow } from "@/lib/client-actions";

export function useCompanyClientsQuery(initialData?: ClientRow[]) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.companyClients.list(),
    queryFn: queryCompanyClients,
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const supabase = createRealtimeClient();
    const channel = supabase
      .channel("company-clients-query-sync")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "clients", filter: "is_company_client=eq.true" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.companyClients.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function prefetchCompanyClients(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.companyClients.list(),
    queryFn: queryCompanyClients,
    staleTime: 5 * 60 * 1000,
  });
}
