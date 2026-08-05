import { redirect } from "next/navigation";
import { getLocale, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDeal, queryClientsSelect, queryUnitsSelect, queryEmployeesForSelect } from "@/lib/finance-actions";
import { DealEditPageClient } from "./deal-edit-page";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect(`/${locale}`);

  const [deal, clients, units, employees] = await Promise.all([
    getDeal(id),
    queryClientsSelect(),
    queryUnitsSelect(),
    queryEmployeesForSelect(),
  ]);

  if (!deal) redirect(`/${locale}/finances`);

  return <DealEditPageClient deal={deal} clients={clients} units={units} employees={employees} />;
}
