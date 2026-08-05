"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DealForm } from "@/components/finances/deal-form";
import { queryKeys } from "@/hooks/queries/query-keys";
import type { DealWithRelations } from "@/lib/finance-types";

export function DealEditPageClient({
  deal,
  clients,
  units,
  employees,
}: {
  deal: DealWithRelations;
  clients: { id: string; customer_name: string; phone: string }[];
  units: { id: string; customer_name: string; compound_name: string | null; unit_type: string | null }[];
  employees: { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null }[];
}) {
  const queryClient = useQueryClient();

  return (
    <DealForm
      mode="edit"
      existingDeal={deal}
      clients={clients}
      units={units}
      employees={employees}
      onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.finances.list() });
      }}
    />
  );
}
