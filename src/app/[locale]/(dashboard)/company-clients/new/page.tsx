import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientForm } from "@/components/clients/client-form";
import { getColumnConfig } from "@/lib/client-config-actions";
import { getAllEmployees } from "@/lib/client-dropdown-actions";
import { queryCampaignsForSelect } from "@/lib/ad-campaign-actions";

export default async function NewCompanyClientPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Clients");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect(`/${locale}/company-clients?error=unauthorized`);

  const [customColumns, employees, campaignOptions] = await Promise.all([
    getColumnConfig(),
    getAllEmployees(),
    queryCampaignsForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("createCompanyClient")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("createCompanyClient")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm mode="create" customColumns={customColumns} employees={employees} campaignOptions={campaignOptions} companyMode />
        </CardContent>
      </Card>
    </div>
  );
}
