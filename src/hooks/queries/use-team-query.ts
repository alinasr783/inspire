"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/query-keys";
import {
  getTeamMembers,
  getEmployeeFullProfile,
  getEmployeeClients,
  getEmployeeProperties,
  getEmployeeVisits,
  getEmployeeTasks,
  getEmployeeAttendance,
  getEmployeeWorkLogs,
  getEmployeeDeals,
  type TeamMemberRow,
  type TeamMemberProfile,
  type MemberClient,
  type MemberProperty,
  type MemberVisit,
  type MemberTask,
  type MemberAttendance,
  type MemberWorkLog,
  type MemberDeal,
} from "@/lib/team-actions";

export function useTeamMembersQuery(initialData?: TeamMemberRow[]) {
  return useQuery({
    queryKey: queryKeys.team.list(),
    queryFn: getTeamMembers,
    initialData,
    staleTime: 5 * 60 * 1000,
  });
}

export function prefetchTeamMembers(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.team.list(),
    queryFn: getTeamMembers,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployeeProfileQuery(employeeId: string, initialData?: TeamMemberProfile | null) {
  return useQuery({
    queryKey: queryKeys.team.member(employeeId),
    queryFn: () => getEmployeeFullProfile(employeeId),
    initialData,
    staleTime: 5 * 60 * 1000,
    enabled: !!employeeId,
  });
}

export function useEmployeeClientsQuery(employeeId: string, initialData?: MemberClient[]) {
  return useQuery({
    queryKey: queryKeys.team.memberClients(employeeId),
    queryFn: () => getEmployeeClients(employeeId),
    initialData,
    staleTime: 5 * 60 * 1000,
    enabled: !!employeeId,
  });
}

export function useEmployeePropertiesQuery(employeeId: string, initialData?: MemberProperty[]) {
  return useQuery({
    queryKey: queryKeys.team.memberProperties(employeeId),
    queryFn: () => getEmployeeProperties(employeeId),
    initialData,
    staleTime: 5 * 60 * 1000,
    enabled: !!employeeId,
  });
}

export function useEmployeeVisitsQuery(employeeId: string, initialData?: MemberVisit[]) {
  return useQuery({
    queryKey: queryKeys.team.memberVisits(employeeId),
    queryFn: () => getEmployeeVisits(employeeId),
    initialData,
    staleTime: 5 * 60 * 1000,
    enabled: !!employeeId,
  });
}

export function useEmployeeTasksQuery(employeeId: string, initialData?: MemberTask[]) {
  return useQuery({
    queryKey: queryKeys.team.memberTasks(employeeId),
    queryFn: () => getEmployeeTasks(employeeId),
    initialData,
    staleTime: 5 * 60 * 1000,
    enabled: !!employeeId,
  });
}

export function useEmployeeAttendanceQuery(
  employeeId: string,
  year?: number,
  month?: number,
  initialData?: MemberAttendance[]
) {
  return useQuery({
    queryKey: queryKeys.team.memberAttendance(employeeId),
    queryFn: () => getEmployeeAttendance(employeeId, year, month),
    initialData,
    staleTime: 2 * 60 * 1000,
    enabled: !!employeeId,
  });
}

export function useEmployeeWorkLogsQuery(
  employeeId: string,
  year?: number,
  month?: number,
  initialData?: MemberWorkLog[]
) {
  return useQuery({
    queryKey: queryKeys.team.memberWorkLogs(employeeId),
    queryFn: () => getEmployeeWorkLogs(employeeId, year, month),
    initialData,
    staleTime: 2 * 60 * 1000,
    enabled: !!employeeId,
  });
}

export function useEmployeeDealsQuery(employeeId: string, initialData?: MemberDeal[]) {
  return useQuery({
    queryKey: queryKeys.team.memberDeals(employeeId),
    queryFn: () => getEmployeeDeals(employeeId),
    initialData,
    staleTime: 5 * 60 * 1000,
    enabled: !!employeeId,
  });
}
