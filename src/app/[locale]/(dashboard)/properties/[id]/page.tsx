import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteUnit } from "@/lib/unit-actions";
import { getColumnConfig } from "@/lib/unit-config-actions";
import { Pencil, Trash2 } from "lucide-react";
import type { UnitRow } from "@/lib/unit-actions";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Properties");
  const tNav = await getTranslations("Nav");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: unit, error } = await supabase
    .from("units")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !unit) {
    notFound();
  }

  const unitData = unit as UnitRow;

  const admin = createAdminClient();
  const { data: creator } = await admin
    .from("profiles")
    .select("first_name, second_name")
    .eq("id", unitData.created_by)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canEdit = unitData.created_by === user.id || profile?.role === "admin";

  const customColumns = await getColumnConfig();
  const enabledCustom = customColumns.filter((c) => c.enabled);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );
  };

  const formatNumber = (val: number | null) => {
    if (val == null) return "";
    return Number(val).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/properties" className="text-sm text-muted-foreground hover:underline">
            ← {tNav("properties")}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{unitData.customer_name}</h1>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link href={`/properties/${unitData.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                {t("editUnit")}
              </Button>
            </Link>
            <form action={deleteUnit.bind(null, unitData.id)}>
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
                <p className="mt-1 text-sm font-medium">{unitData.customer_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("phone")}</p>
                <p className="mt-1 text-sm font-medium" dir="ltr">{unitData.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("compoundName")}</p>
                <p className="mt-1 text-sm font-medium">{unitData.compound_name}</p>
              </div>
              {unitData.area && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("area")}</p>
                  <p className="mt-1 text-sm font-medium">{unitData.area}</p>
                </div>
              )}
              {unitData.building_number && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("buildingNumber")}</p>
                  <p className="mt-1 text-sm font-medium">{unitData.building_number}</p>
                </div>
              )}
              {unitData.finishing_status && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("finishingStatus")}</p>
                  <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
                    {unitData.finishing_status}
                  </span>
                </div>
              )}
              {unitData.rent_sale && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("rentSale")}</p>
                  <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
                    {unitData.rent_sale}
                  </span>
                </div>
              )}
              {unitData.unit_type && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("unitType")}</p>
                  <p className="mt-1 text-sm font-medium">{unitData.unit_type}</p>
                </div>
              )}
              {unitData.cash_required != null && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("cashRequired")}</p>
                  <p className="mt-1 text-sm font-medium" dir="ltr">
                    {formatNumber(unitData.cash_required)}
                  </p>
                </div>
              )}
              {unitData.remaining != null && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("remaining")}</p>
                  <p className="mt-1 text-sm font-medium" dir="ltr">
                    {formatNumber(unitData.remaining)}
                  </p>
                </div>
              )}
              {unitData.last_contact_date && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("lastContactDate")}</p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(unitData.last_contact_date)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("additionalNotes")} &amp; {t("feedback")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {unitData.additional_notes ? (
              <div>
                <p className="text-xs text-muted-foreground">{t("additionalNotes")}</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{unitData.additional_notes}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">{t("additionalNotes")}</p>
                <p className="mt-1 text-sm text-muted-foreground">—</p>
              </div>
            )}
            {unitData.feedback ? (
              <div>
                <p className="text-xs text-muted-foreground">{t("feedback")}</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{unitData.feedback}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">{t("feedback")}</p>
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
                  const val = (unitData.custom_fields as Record<string, unknown>)?.[col.key];
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
            <div className="flex gap-8">
              <div>
                <span className="text-muted-foreground">{t("createdAt")}: </span>
                <span className="font-medium">
                  {formatDate(unitData.created_at)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("updatedAt")}: </span>
                <span className="font-medium">
                  {formatDate(unitData.updated_at)}
                </span>
              </div>
            </div>
            {creator && (
              <div>
                <span className="text-muted-foreground">{t("createdBy")}: </span>
                <span className="font-medium">
                  {[creator.first_name, creator.second_name].filter(Boolean).join(" ")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
