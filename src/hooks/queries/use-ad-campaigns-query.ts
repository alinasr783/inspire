"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/query-keys";
import {
  getAdCampaignsOverview,
  getAdCampaignDetail,
  queryCampaignsForSelect,
} from "@/lib/ad-campaign-actions";

export function useAdCampaignsQuery() {
  return useQuery({
    queryKey: queryKeys.adCampaigns.list(),
    queryFn: () => getAdCampaignsOverview(),
    staleTime: 30_000,
  });
}

export function useAdCampaignDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.adCampaigns.detail(id),
    queryFn: () => getAdCampaignDetail(id),
    staleTime: 30_000,
  });
}

export function useAdCampaignOptionsQuery() {
  return useQuery({
    queryKey: queryKeys.adCampaigns.options(),
    queryFn: () => queryCampaignsForSelect(),
    staleTime: 60_000,
  });
}

export function prefetchAdCampaigns(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.prefetchQuery({
    queryKey: queryKeys.adCampaigns.list(),
    queryFn: () => getAdCampaignsOverview(),
    staleTime: 30_000,
  });
}
