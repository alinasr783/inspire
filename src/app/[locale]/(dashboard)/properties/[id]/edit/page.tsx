import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnitForm } from "@/components/units/unit-form";
import { getColumnConfig } from "@/lib/unit-config-actions";
import type { UnitRow } from "@/lib/unit-actions";

export default async function EditUnitPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Properties");

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canEdit = unitData.created_by === user.id || profile?.role === "admin";
  if (!canEdit) {
    redirect(`/${locale}/properties/${id}?error=unauthorized`);
  }

  const allColumns = await getColumnConfig();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("editUnit")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{unitData.customer_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitForm
            mode="edit"
            unitId={id}
            allColumns={allColumns}
            defaultValues={{
              customer_name: unitData.customer_name,
              phone: unitData.phone,
              compound_name: unitData.compound_name,
              area: unitData.area ?? "",
              building_number: unitData.building_number ?? "",
              finishing_status: unitData.finishing_status ?? "",
              rent_sale: unitData.rent_sale ?? "",
              unit_type: unitData.unit_type ?? "",
              cash_required: unitData.cash_required ?? undefined,
              remaining: unitData.remaining ?? undefined,
              last_contact_date: unitData.last_contact_date ?? "",
              additional_notes: unitData.additional_notes ?? "",
              feedback: unitData.feedback ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
