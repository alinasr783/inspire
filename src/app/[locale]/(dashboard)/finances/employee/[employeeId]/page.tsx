import { redirect } from "next/navigation";
import { getLocale, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmployeeFinanceDetail } from "@/lib/finance-actions";
import { EmployeeDetailPage } from "./employee-detail-page";

export default async function EmployeeDetailServerPage({
  params,
}: {
  params: Promise<{ locale: string; employeeId: string }>;
}) {
  const { locale, employeeId } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect(`/${locale}`);

  const data = await getEmployeeFinanceDetail(employeeId);
  if (!data) redirect(`/${locale}/finances`);

  return <EmployeeDetailPage data={data} />;
}
