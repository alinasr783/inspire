"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarCheck } from "lucide-react";
import { useEmployeeVisitsQuery } from "@/hooks/queries/use-team-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { MemberVisit } from "@/lib/team-actions";

const statusStyles: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

export function EmployeeVisitsTab({ employeeId }: { employeeId: string }) {
  const t = useTranslations("Team");
  const { data: visits, isLoading } = useEmployeeVisitsQuery(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          {t("visitsTab")} ({visits?.length ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!visits || visits.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noVisits")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-2 text-start font-medium">{t("firstName")}</th>
                  <th className="px-3 py-2 text-start font-medium hidden md:table-cell">{t("properties")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("checkInDate")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{v.client_name || "—"}</td>
                    <td className="px-3 py-2 text-xs hidden md:table-cell">
                      {v.compound_name} - {v.building_number}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {v.visit_date ? format(new Date(v.visit_date), "yyyy/MM/dd") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusStyles[v.status] ?? statusStyles.upcoming)}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
