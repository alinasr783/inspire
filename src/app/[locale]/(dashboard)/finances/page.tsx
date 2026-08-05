import { redirect } from "next/navigation";
import { getLocale, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryFinances } from "@/lib/finance-actions";
import { FinancesPage } from "@/components/finances/finances-page";

export default async function FinancesPageServer({
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
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect(`/${locale}`);
  }

  const financeData = await queryFinances();

  return (
    <FinancesPage
      locale={locale}
      initialDeals={financeData.deals}
      initialSummary={financeData.summary}
    />
  );
}
