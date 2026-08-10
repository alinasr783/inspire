"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, ExternalLink } from "lucide-react";
import { useEmployeeClientsQuery } from "@/hooks/queries/use-team-query";
import { format } from "date-fns";
import type { MemberClient } from "@/lib/team-actions";

export function EmployeeClientsTab({ employeeId }: { employeeId: string }) {
  const t = useTranslations("Team");
  const { data: clients, isLoading } = useEmployeeClientsQuery(employeeId);

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
          <Users className="h-4 w-4 text-primary" />
          {t("clientsTab")} ({clients?.length ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!clients || clients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noClients")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-2 text-start font-medium">{t("firstName")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("phone")}</th>
                  <th className="px-3 py-2 text-start font-medium hidden md:table-cell">{t("properties")}</th>
                  <th className="px-3 py-2 text-start font-medium hidden md:table-cell">{t("checkInDate")}</th>
                  <th className="px-3 py-2 text-end font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{c.customer_name}</td>
                    <td className="px-3 py-2 text-xs" dir="ltr">{c.phone}</td>
                    <td className="px-3 py-2 text-xs hidden md:table-cell">
                      {c.preferred_area ? (
                        <Badge variant="outline" className="text-[10px]">{c.preferred_area}</Badge>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">
                      {c.created_at ? format(new Date(c.created_at), "yyyy/MM/dd") : "—"}
                    </td>
                    <td className="px-3 py-2 text-end">
                      <Link
                        href={`/clients/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {t("viewAll")}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
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
