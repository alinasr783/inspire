import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnitForm } from "@/components/units/unit-form";
import { getColumnConfig } from "@/lib/unit-config-actions";

export default async function NewUnitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Properties");

  const allColumns = await getColumnConfig();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("createUnit")}</h1>
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
