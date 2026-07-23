import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getRecord } from "@/lib/unconfirmed-data-actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil } from "lucide-react";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("UnconfirmedData");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  let record = null;
  let error = false;
  try {
    record = await getRecord(id);
  } catch {
    error = true;
  }

  if (error || !record) {
    redirect(`/${locale}/unconfirmed-data`);
  }

  const fields: Array<{ key: string; label: string }> = [
    { key: "owner_name", label: t("ownerName") },
    { key: "unit_area", label: t("unitArea") },
    { key: "building_number", label: t("buildingNumber") },
    { key: "unit_number", label: t("unitNumber") },
    { key: "owner_phone", label: t("phone") },
    { key: "owner_phone_alt", label: t("phoneAlt") },
    { key: "affiliated_company", label: t("affiliatedCompany") },
    { key: "last_feedback", label: t("lastFeedback") },
    { key: "last_contact_date", label: t("lastContactDate") },
  ];

  const whatsappBadge = () => {
    const state = record.whatsapp_state;
    if (state === "send") {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t("sent")}</Badge>;
    }
    if (state === "failed") {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t("sendFailed")}</Badge>;
    }
    return <Badge variant="outline">{t("notSent")}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/unconfirmed-data">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("viewDetails")}</h1>
          <p className="text-sm text-muted-foreground">{record.owner_name || record.id}</p>
        </div>
        <Link href={`/unconfirmed-data/${record.id}/edit`}>
          <Button variant="outline" className="gap-2">
            <Pencil className="h-4 w-4" />
            {t("edit")}
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("recordInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((f) => (
              <div key={f.key}>
                <p className="text-xs text-muted-foreground mb-0.5">{f.label}</p>
                <p className="text-sm font-medium">
                  {f.key === "last_contact_date" && record.last_contact_date
                    ? new Date(record.last_contact_date).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" })
                    : String(record[f.key as keyof typeof record] ?? "—")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("whatsappState")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {whatsappBadge()}
              </div>
            </CardContent>
          </Card>

          {record.extra_data && Object.keys(record.extra_data).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("extraColumns")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(record.extra_data).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground mb-0.5">{key}</p>
                    <p className="text-sm">{String(value ?? "—")}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {record.ai_notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("aiNotes")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-600 dark:text-amber-400">{record.ai_notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
