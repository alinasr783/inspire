import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnitForm } from "@/components/units/unit-form";
import { UnitFormError } from "@/components/units/unit-form-error";
import { getColumnConfig } from "@/lib/unit-config-actions";

export default async function NewUnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Properties");
  const sp = await searchParams;

  const allColumns = await getColumnConfig();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("createUnit")}</h1>
      <UnitFormError error={sp.error} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("createUnit")}</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitForm mode="create" allColumns={allColumns} />
        </CardContent>
      </Card>
    </div>
  );
}
