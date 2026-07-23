import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getColumnConfig } from "@/lib/unit-config-actions";
import type { UnitRow } from "@/lib/unit-actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload } from "lucide-react";
import { UnitFilters } from "@/components/units/unit-filters";
import { PaginatedUnitTable } from "@/components/units/paginated-unit-table";
import { ColumnConfigModal } from "@/components/units/column-config-modal";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PropertiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Properties");
  const tNav = await getTranslations("Nav");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const allColumns = await getColumnConfig();

  let query = supabase
    .from("units")
    .select("*")
    .order("created_at", { ascending: false });

  if (sp.q) {
    query = query.or(
      `customer_name.ilike.%${sp.q}%,` +
      `phone.ilike.%${sp.q}%,` +
      `compound_name.ilike.%${sp.q}%,` +
      `additional_notes.ilike.%${sp.q}%,` +
      `feedback.ilike.%${sp.q}%`
    );
  }

  if (sp.finishing_status && sp.finishing_status !== "all") {
    query = query.eq("finishing_status", sp.finishing_status);
  }
  if (sp.rent_sale && sp.rent_sale !== "all") {
    query = query.eq("rent_sale", sp.rent_sale);
  }
  if (sp.unit_type && sp.unit_type !== "all") {
    query = query.eq("unit_type", sp.unit_type);
  }
  if (sp.compound_name && sp.compound_name !== "all") {
    query = query.eq("compound_name", sp.compound_name);
  }

  if (sp.cash_from) query = query.gte("cash_required", Number(sp.cash_from));
  if (sp.cash_to) query = query.lte("cash_required", Number(sp.cash_to));
  if (sp.remaining_from) query = query.gte("remaining", Number(sp.remaining_from));
  if (sp.remaining_to) query = query.lte("remaining", Number(sp.remaining_to));
  if (sp.area_eq) {
    query = query.eq("area", sp.area_eq);
  } else {
    if (sp.area_from) query = query.gte("area", sp.area_from);
    if (sp.area_to) query = query.lte("area", sp.area_to);
  }

  const customCols = allColumns.filter((c) => !c.is_builtin && c.enabled);
  for (const col of customCols) {
    const val = sp[col.key];
    if (val && val !== "all") {
      query = query.filter(`custom_fields->>${col.key}`, "ilike", `%${val}%`);
    }
  }

  const { data: units } = await query;
  const unitsData = (units ?? []) as UnitRow[];

  const cashValues = unitsData
    .map((u) => u.cash_required)
    .filter((v): v is number => v != null);
  const remainingValues = unitsData
    .map((u) => u.remaining)
    .filter((v): v is number => v != null);
  const areaValues = unitsData
    .map((u) => Number(u.area))
    .filter((v) => !isNaN(v));

  const { data: compoundNames } = await supabase
    .from("units")
    .select("compound_name")
    .not("compound_name", "is", null)
    .not("compound_name", "eq", "");
  const uniqueCompounds = [...new Set((compoundNames ?? []).map((r: { compound_name: string }) => r.compound_name))].sort();

  const rangeLimits = {
    cash_required:
      cashValues.length > 0
        ? { min: Math.min(...cashValues), max: Math.max(...cashValues) }
        : null,
    remaining:
      remainingValues.length > 0
        ? { min: Math.min(...remainingValues), max: Math.max(...remainingValues) }
        : null,
    area:
      areaValues.length > 0
        ? { min: Math.min(...areaValues), max: Math.max(...areaValues) }
        : null,
    building_number: null as { min: string; max: string } | null,
  };

  const creatorIds = [...new Set(unitsData.map((u) => u.created_by))];
  const admin = createAdminClient();
  const { data: creators } = await admin
    .from("profiles")
    .select("id, first_name, second_name")
    .in("id", creatorIds.length > 0 ? creatorIds : ["none"]);

  const creatorMap = new Map(
    (creators ?? []).map((c: { id: string; first_name: string | null; second_name: string | null }) => [
      c.id,
      [c.first_name, c.second_name].filter(Boolean).join(" "),
    ])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{tNav("properties")}</h1>
        <div className="flex items-center gap-2">
          <ColumnConfigModal />
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
          <UnitFilters customColumns={customCols} rangeLimits={rangeLimits} compoundNames={uniqueCompounds} />

          <PaginatedUnitTable columns={allColumns} units={unitsData} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
