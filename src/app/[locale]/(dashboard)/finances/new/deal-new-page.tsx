"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DealForm } from "@/components/finances/deal-form";
import { queryKeys } from "@/hooks/queries/query-keys";
import type { AdCampaignOption } from "@/lib/ad-campaign-types";

type PartnerCandidate = {
  id: string;
  first_name: string | null;
  second_name: string | null;
  position: string | null;
  avatar_url: string | null;
  is_current_user: boolean;
};

export function DealNewPage({ employees, partners, currentUserId, campaignOptions }: {
  employees: { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null }[];
  partners: PartnerCandidate[];
  currentUserId: string;
  campaignOptions?: AdCampaignOption[];
}) {
  const queryClient = useQueryClient();
  return <DealForm mode="create" employees={employees} partners={partners} currentUserId={currentUserId} campaignOptions={campaignOptions} onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.finances.list() })} />;
}
