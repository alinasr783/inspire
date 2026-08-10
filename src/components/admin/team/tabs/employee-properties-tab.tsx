"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, ExternalLink } from "lucide-react";
import { useEmployeePropertiesQuery } from "@/hooks/queries/use-team-query";
import { format } from "date-fns";

export function EmployeePropertiesTab({ employeeId }: { employeeId: string }) {
  const t = useTranslations("Team");
  const { data: properties, isLoading } = useEmployeePropertiesQuery(employeeId);

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
          <Building2 className="h-4 w-4 text-primary" />
          {t("propertiesTab")} ({properties?.length ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!properties || properties.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noProperties")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-3 py-2 text-start font-medium">{t("firstName")}</th>
                  <th className="px-3 py-2 text-start font-medium hidden md:table-cell">{t("properties")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("role")}</th>
                  <th className="px-3 py-2 text-start font-medium hidden md:table-cell">{t("deals")}</th>
                  <th className="px-3 py-2 text-end font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{p.customer_name}</td>
                    <td className="px-3 py-2 text-xs hidden md:table-cell">
                      {p.compound_name ? (
                        <Badge variant="outline" className="text-[10px]">{p.compound_name}</Badge>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {p.rent_sale ? (
                        <Badge variant="secondary" className="text-[10px]">{p.rent_sale}</Badge>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell">
                      {p.cash_required != null ? `${Number(p.cash_required).toLocaleString()} ج.م` : "—"}
                    </td>
                    <td className="px-3 py-2 text-end">
                      <Link
                        href={`/properties/${p.id}`}
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
