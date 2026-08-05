import { redirect } from "next/navigation";
import { getLocale, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryClientsSelect, queryUnitsSelect, queryEmployeesForSelect } from "@/lib/finance-actions";
import { DealNewPage } from "./deal-new-page";

export default async function NewDealPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect(`/${locale}`);

  const [clients, units, employees] = await Promise.all([
    queryClientsSelect(),
    queryUnitsSelect(),
    queryEmployeesForSelect(),
  ]);

  return <DealNewPage clients={clients} units={units} employees={employees} />;
}
