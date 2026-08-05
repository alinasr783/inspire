import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VisitForm } from "@/components/visits/visit-form";
import type { VisitRow } from "@/lib/visit-actions";

export default async function EditVisitPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Visits");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();
  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = currentProfile?.role === "admin";

  let query = admin.from("visits").select("*").eq("id", id);

  if (!isAdmin) {
    query = query.eq("created_by", user.id);
  }

  const { data: visit, error } = await query.single();

  if (error || !visit) {
    notFound();
  }

  const visitData = visit as VisitRow;

  const { data: clients } = await admin
    .from("clients")
    .select("id, customer_name, phone")
    .or(`assigned_employee.eq.${user.id},created_by.eq.${user.id}`)
    .order("customer_name", { ascending: true });

  const { data: units } = await admin
    .from("units")
    .select("id, customer_name, phone, compound_name, building_number, unit_type")
    .order("customer_name", { ascending: true });

  let employees: { id: string; first_name: string; second_name: string }[] = [];
  if (isAdmin) {
    const { data: emps } = await admin
      .from("profiles")
      .select("id, first_name, second_name")
      .eq("approval_status", "approved")
      .order("first_name", { ascending: true });
    employees = (emps ?? []) as { id: string; first_name: string; second_name: string }[];
  }

  const defaultValues = {
    client_id: visitData.client_id,
    unit_id: visitData.unit_id,
    compound_name: visitData.compound_name,
    building_number: visitData.building_number,
    apartment_number: visitData.apartment_number,
    visit_date: visitData.visit_date.slice(0, 16),
    notes: visitData.notes || "",
    status: visitData.status,
    assigned_to: visitData.assigned_to || "",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("editVisit")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("editVisit")}</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitForm
            mode="edit"
            visitId={id}
            locale={locale}
            isAdmin={isAdmin}
            defaultValues={defaultValues}
            clients={(clients ?? []) as { id: string; customer_name: string; phone: string }[]}
            units={(units ?? []) as {
              id: string;
              customer_name: string;
              phone: string;
              compound_name: string;
              building_number: string;
              unit_type: string;
            }[]}
            employees={employees}
          />
        </CardContent>
      </Card>
    </div>
  );
}
