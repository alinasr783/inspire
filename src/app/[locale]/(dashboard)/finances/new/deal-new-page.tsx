"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DealForm } from "@/components/finances/deal-form";
import { queryKeys } from "@/hooks/queries/query-keys";

export function DealNewPage({
  clients,
  units,
  employees,
}: {
  clients: { id: string; customer_name: string; phone: string }[];
  units: { id: string; customer_name: string; compound_name: string | null; unit_type: string | null }[];
  employees: { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null }[];
}) {
  const queryClient = useQueryClient();

  return (
    <DealForm
      mode="create"
      clients={clients}
      units={units}
      employees={employees}
      onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.finances.list() });
      }}
    />
  );
}
