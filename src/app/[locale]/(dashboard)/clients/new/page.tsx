import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientForm } from "@/components/clients/client-form";
import { getColumnConfig } from "@/lib/client-config-actions";
import { getAllEmployees } from "@/lib/client-dropdown-actions";

export default async function NewClientPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Clients");

  const [customColumns, employees] = await Promise.all([
    getColumnConfig(),
    getAllEmployees(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("createClient")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("createClient")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm mode="create" customColumns={customColumns} employees={employees} />
        </CardContent>
      </Card>
    </div>
  );
}
