import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getColumnConfig } from "@/lib/unit-config-actions";
import type { UnitRow } from "@/lib/unit-actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload } from "lucide-react";
import { PropertiesClient } from "@/components/units/properties-client";
import { ColumnConfigModal } from "@/components/units/column-config-modal";
import { ShortcutsHelp } from "@/components/units/shortcuts-help";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PropertiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Properties");
  const tNav = await getTranslations("Nav");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();

  const allColumns = await getColumnConfig();

  const { data: allUnits } = await admin
    .from("units")
    .select("*")
    .order("created_at", { ascending: false });

  const unitsData = (allUnits ?? []) as UnitRow[];

  const uniqueVals = async (col: string) => {
    const { data } = await admin
      .from("units")
      .select(col)
      .not(col, "is", null)
      .not(col, "eq", "");
    return [...new Set((data ?? []).map((r: any) => r[col]))].sort();
  };
  const uniqueFinishing = await uniqueVals("finishing_status");
  const uniqueRentSale = await uniqueVals("rent_sale");
  const uniqueUnitType = await uniqueVals("unit_type");
  const uniqueCompounds = await uniqueVals("compound_name");
  const uniqueAreas = await uniqueVals("area");

  const allUnitsQuery = await admin.from("units").select("cash_required, remaining");
  const allNums = (allUnitsQuery.data ?? []) as {
    cash_required: number | null;
    remaining: number | null;
  }[];
  const cashVals = allNums.map((u) => u.cash_required).filter((v): v is number => v != null);
  const remVals = allNums.map((u) => u.remaining).filter((v): v is number => v != null);

  const rangeLimits = {
    cash_required:
      cashVals.length > 0
        ? { min: Math.min(...cashVals), max: Math.max(...cashVals) }
        : null,
    remaining:
      remVals.length > 0
        ? { min: Math.min(...remVals), max: Math.max(...remVals) }
        : null,
  };

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = currentProfile?.role === "admin";

  const { data: allEmployees } = await admin.from("profiles").select("id, first_name, second_name").eq("approval_status", "approved");
  const employeeMap = new Map((allEmployees ?? []).map((a: { id: string; first_name: string | null; second_name: string | null }) => [a.id, [a.first_name, a.second_name].filter(Boolean).join(" ") || a.id]));
  const employeeOptions = (allEmployees ?? []).map((a: { id: string; first_name: string | null; second_name: string | null }) => ({ id: a.id, name: [a.first_name, a.second_name].filter(Boolean).join(" ") || a.id }));

  const customCols = allColumns.filter((c) => !c.is_builtin && c.enabled);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center text-xl font-bold tracking-tight sm:text-2xl">
            {tNav("properties")} <ShortcutsHelp locale={locale} />
          </h1>
          <Link href="/properties/new" className="shrink-0">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {t("createUnit")}
            </Button>
          </Link>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="shrink-0"><ColumnConfigModal /></span>
            <Link href="/properties/group-add" className="shrink-0">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4" />
                {t("groupAddUnits")}
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Card className="flex max-h-[calc(100vh-180px)] flex-col">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {t("allProperties")}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{unitsData.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto pt-0">
          <PropertiesClient
            initialUnits={unitsData}
            columns={allColumns}
            locale={locale}
            isAdmin={isAdmin}
            employeeMap={employeeMap}
            employeeOptions={employeeOptions}
            userId={user.id}
            customColumns={customCols}
            uniqueFinishing={uniqueFinishing}
            uniqueRentSale={uniqueRentSale}
            uniqueUnitType={uniqueUnitType}
            uniqueCompounds={uniqueCompounds}
            uniqueAreas={uniqueAreas}
            rangeLimits={rangeLimits}
          />
        </CardContent>
      </Card>
    </div>
  );
}
