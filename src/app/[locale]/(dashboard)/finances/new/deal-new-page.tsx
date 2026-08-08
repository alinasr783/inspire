"use client";

import { useQueryClient } from "@tanstack/react-query";
import { DealForm } from "@/components/finances/deal-form";
import { queryKeys } from "@/hooks/queries/query-keys";

export function DealNewPage({ employees }: { employees: { id: string; first_name: string | null; second_name: string | null; position: string | null; avatar_url: string | null }[] }) {
  const queryClient = useQueryClient();
  return <DealForm mode="create" employees={employees} onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.finances.list() })} />;
}
