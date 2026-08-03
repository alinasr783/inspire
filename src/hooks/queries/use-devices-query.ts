"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/query-keys";
import { queryDevices } from "@/lib/query-actions";
import type { DeviceRow } from "@/lib/device-actions";

export function useDevicesQuery(initialData?: DeviceRow[]) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.devices.list(),
    queryFn: queryDevices,
    initialData,
    staleTime: 5 * 60 * 1000,
  });
}

export function prefetchDevices(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.devices.list(),
    queryFn: queryDevices,
    staleTime: 5 * 60 * 1000,
  });
}
