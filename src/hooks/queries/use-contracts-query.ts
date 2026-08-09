"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";
import { fetchTemplates, fetchTemplate, fetchInstances, fetchInstance } from "@/lib/contract-actions";
import type { ContractTemplate, ContractInstance } from "@/lib/contract-actions";

export function useContractTemplates() {
  return useQuery<ContractTemplate[]>({
    queryKey: queryKeys.contracts.templates(),
    queryFn: async () => {
      const result = await fetchTemplates();
      return result;
    },
    staleTime: 60_000,
  });
}

export function useContractTemplate(templateId: string) {
  return useQuery<ContractTemplate | null>({
    queryKey: queryKeys.contracts.template(templateId),
    queryFn: async () => {
      const result = await fetchTemplate(templateId);
      return result;
    },
    enabled: !!templateId,
    staleTime: 60_000,
  });
}

export function useContractInstances() {
  return useQuery<ContractInstance[]>({
    queryKey: queryKeys.contracts.instances(),
    queryFn: async () => {
      const result = await fetchInstances();
      return result;
    },
    staleTime: 60_000,
  });
}

export function useContractInstance(instanceId: string) {
  return useQuery<ContractInstance | null>({
    queryKey: queryKeys.contracts.instance(instanceId),
    queryFn: async () => {
      const result = await fetchInstance(instanceId);
      return result;
    },
    enabled: !!instanceId,
    staleTime: 60_000,
  });
}

export function useCreateTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; content: Record<string, unknown> }) => {
      const { createTemplate } = await import("@/lib/contract-actions");
      return createTemplate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

export function useUpdateTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId: string;
      data: { name?: string; content?: Record<string, unknown>; is_active?: boolean };
    }) => {
      const { updateTemplate } = await import("@/lib/contract-actions");
      return updateTemplate(templateId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

export function useDeleteTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { deleteTemplate } = await import("@/lib/contract-actions");
      return deleteTemplate(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

export function useCreateInstanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      template_id: string;
      filled_data: Record<string, unknown>;
      related_client_id?: string;
      related_unit_id?: string;
      related_deal_id?: string;
    }) => {
      const { createInstance } = await import("@/lib/contract-actions");
      return createInstance(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

export function useDeleteInstanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      const { deleteInstance } = await import("@/lib/contract-actions");
      return deleteInstance(instanceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

export function prefetchContracts(queryClient: ReturnType<typeof import("@tanstack/react-query").useQueryClient>) {
  queryClient.prefetchQuery({
    queryKey: queryKeys.contracts.templates(),
    queryFn: async () => {
      const result = await fetchTemplates();
      return result;
    },
  });
}
