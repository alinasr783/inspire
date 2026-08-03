"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/query-keys";
import { queryEmployees } from "@/lib/query-actions";
import type { EmployeeRow } from "@/lib/task-types";

export function useEmployeesQuery(initialData?: EmployeeRow[]) {
  return useQuery({
    queryKey: queryKeys.employees.list(),
    queryFn: queryEmployees,
    initialData,
    staleTime: 10 * 60 * 1000,
  });
}

export function prefetchEmployees(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.employees.list(),
    queryFn: queryEmployees,
    staleTime: 10 * 60 * 1000,
  });
}
