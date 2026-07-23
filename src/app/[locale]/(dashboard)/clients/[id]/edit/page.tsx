import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientForm } from "@/components/clients/client-form";
import { getColumnConfig } from "@/lib/client-config-actions";
import { getAllEmployees } from "@/lib/client-dropdown-actions";
import type { ClientRow } from "@/lib/client-actions";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Clients");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();
  const { data: client, error } = await admin
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !client) {
    notFound();
  }

  const clientData = client as ClientRow;

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canEdit = clientData.created_by === user.id || profile?.role === "admin";
  if (!canEdit) {
    redirect(`/${locale}/clients/${id}?error=unauthorized`);
  }

  const customColumns = await getColumnConfig();
  const employees = await getAllEmployees();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("editClient")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{clientData.customer_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            mode="edit"
            clientId={id}
            customColumns={customColumns}
            employees={employees}
            defaultValues={{
              customer_name: clientData.customer_name,
              phone: clientData.phone,
              phone_alt: clientData.phone_alt ?? "",
              budget_from: clientData.budget_from ?? undefined,
              budget_to: clientData.budget_to ?? undefined,
              payment_method: clientData.payment_method ?? "",
              preferred_area: clientData.preferred_area ?? "",
              unit_type: clientData.unit_type ?? "",
              bedrooms: clientData.bedrooms ?? "",
              preferred_developer: clientData.preferred_developer ?? "",
              source: clientData.source ?? "",
              additional_notes: clientData.additional_notes ?? "",
              last_contact_date: clientData.last_contact_date ?? "",
              assigned_employee: clientData.assigned_employee ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
