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

  const allColumns = await getColumnConfig();

  const { data: allUnits } = await supabase
    .from("units")
    .select("*")
    .order("created_at", { ascending: false });

  const unitsData = (allUnits ?? []) as UnitRow[];

  const uniqueVals = async (col: string) => {
    const { data } = await supabase
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

  const allUnitsQuery = await supabase.from("units").select("cash_required, remaining");
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

  const admin = createAdminClient();
  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = currentProfile?.role === "admin";

  const customCols = allColumns.filter((c) => !c.is_builtin && c.enabled);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{tNav("properties")}</h1>
        <div className="flex items-center gap-2">
          {isAdmin && <ColumnConfigModal />}
          <Link href="/properties/group-add">
            <Button variant="outline">
              <Upload className="h-4 w-4" />
              {t("groupAddUnits")}
            </Button>
          </Link>
          <Link href="/properties/new">
            <Button>
              <Plus className="h-4 w-4" />
              {t("createUnit")}
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("allProperties")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PropertiesClient
            initialUnits={unitsData}
            columns={allColumns}
            locale={locale}
            isAdmin={isAdmin}
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
