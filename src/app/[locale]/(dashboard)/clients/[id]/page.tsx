import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteClient } from "@/lib/client-actions";
import { getColumnConfig } from "@/lib/client-config-actions";
import { Pencil, Trash2 } from "lucide-react";
import type { ClientRow } from "@/lib/client-actions";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Clients");
  const tNav = await getTranslations("Nav");

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

  const { data: creator } = await admin
    .from("profiles")
    .select("first_name, second_name")
    .eq("id", clientData.created_by)
    .single();

  const { data: assignee } = clientData.assigned_employee
    ? await admin
        .from("profiles")
        .select("first_name, second_name")
        .eq("id", clientData.assigned_employee)
        .single()
    : { data: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canEdit = clientData.created_by === user.id || profile?.role === "admin";

  const customColumns = await getColumnConfig();
  const enabledCustom = customColumns.filter((c) => c.enabled);

  const formatNumber = (val: number | null) => {
    if (val == null) return "";
    return Number(val).toLocaleString();
  };

  const creatorName = creator
    ? [creator.first_name, creator.second_name].filter(Boolean).join(" ")
    : "—";

  const assigneeName = assignee
    ? [assignee.first_name, assignee.second_name].filter(Boolean).join(" ")
    : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/clients" className="text-sm text-muted-foreground hover:underline">
            ← {tNav("clients")}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{clientData.customer_name}</h1>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link href={`/clients/${clientData.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                {t("editClient")}
              </Button>
            </Link>
            <form action={deleteClient.bind(null, clientData.id)}>
              <Button type="submit" variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" />
                {t("delete")}
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("customerName")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("customerName")}</p>
                <p className="mt-1 text-sm font-medium">{clientData.customer_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("phone")}</p>
                <p className="mt-1 text-sm font-medium" dir="ltr">{clientData.phone}</p>
              </div>
              {clientData.phone_alt && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("phoneAlt")}</p>
                  <p className="mt-1 text-sm font-medium" dir="ltr">{clientData.phone_alt}</p>
                </div>
              )}
              {clientData.budget_from != null && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("budget")}</p>
                  <p className="mt-1 text-sm font-medium" dir="ltr">
                    {formatNumber(clientData.budget_from)}
                    {clientData.budget_to ? ` - ${formatNumber(clientData.budget_to)}` : ""}
                  </p>
                </div>
              )}
              {clientData.payment_method && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("paymentMethod")}</p>
                  <p className="mt-1 text-sm font-medium">{clientData.payment_method}</p>
                </div>
              )}
              {clientData.preferred_area && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("preferredArea")}</p>
                  <p className="mt-1 text-sm font-medium">{clientData.preferred_area}</p>
                </div>
              )}
              {clientData.unit_type && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("unitType")}</p>
                  <p className="mt-1 text-sm font-medium">{clientData.unit_type}</p>
                </div>
              )}
              {clientData.bedrooms && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("bedrooms")}</p>
                  <p className="mt-1 text-sm font-medium">{clientData.bedrooms}</p>
                </div>
              )}
              {clientData.preferred_developer && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("preferredDeveloper")}</p>
                  <p className="mt-1 text-sm font-medium">{clientData.preferred_developer}</p>
                </div>
              )}
              {clientData.source && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("source")}</p>
                  <p className="mt-1 text-sm font-medium">{clientData.source}</p>
                </div>
              )}
              {clientData.last_contact_date && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("lastContactDate")}</p>
                  <p className="mt-1 text-sm font-medium">
                    {new Date(clientData.last_contact_date).toLocaleDateString(
                      locale === "ar" ? "ar-EG" : "en-US",
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("additionalNotes")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientData.additional_notes ? (
              <div>
                <p className="text-xs text-muted-foreground">{t("additionalNotes")}</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{clientData.additional_notes}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">{t("additionalNotes")}</p>
                <p className="mt-1 text-sm text-muted-foreground">—</p>
              </div>
            )}
          </CardContent>
        </Card>

        {enabledCustom.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("manageColumns")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {enabledCustom.map((col) => {
                  const val = (clientData.custom_fields as Record<string, unknown>)?.[col.key];
                  return (
                    <div key={col.key}>
                      <p className="text-xs text-muted-foreground">
                        {locale === "ar" ? col.label_ar : col.label_en}
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {val != null ? String(val) : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("createdBy")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <span className="text-xs text-muted-foreground">{t("createdAt")}: </span>
                <p className="font-medium">
                  {new Date(clientData.created_at).toLocaleDateString(
                    locale === "ar" ? "ar-EG" : "en-US",
                    { year: "numeric", month: "short", day: "numeric" }
                  )}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("updatedAt")}: </span>
                <p className="font-medium">
                  {new Date(clientData.updated_at).toLocaleDateString(
                    locale === "ar" ? "ar-EG" : "en-US",
                    { year: "numeric", month: "short", day: "numeric" }
                  )}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("createdBy")}: </span>
                <p className="font-medium">{creatorName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("assignedEmployee")}: </span>
                <p className="font-medium">{assigneeName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
