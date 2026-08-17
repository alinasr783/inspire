"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DealForm } from "@/components/finances/deal-form";
import { queryKeys } from "@/hooks/queries/query-keys";
import type { DealWithRelations } from "@/lib/finance-types";
import type { AdCampaignOption } from "@/lib/ad-campaign-types";

type PartnerCandidate = {
  id: string;
  first_name: string | null;
  second_name: string | null;
  position: string | null;
  avatar_url: string | null;
  is_current_user: boolean;
};

export function DealEditPageClient({ deal, employees, partners, currentUserId, campaignOptions }: {
  deal: DealWithRelations;
  employees: { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null }[];
  partners: PartnerCandidate[];
  currentUserId: string;
  campaignOptions?: AdCampaignOption[];
}) {
  const queryClient = useQueryClient();
  return <DealForm mode="edit" existingDeal={deal} employees={employees} partners={partners} currentUserId={currentUserId} campaignOptions={campaignOptions} onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.finances.list() })} />;
}
