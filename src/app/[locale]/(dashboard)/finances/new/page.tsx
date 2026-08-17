import { redirect } from "next/navigation";
import { getLocale, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryEmployeesForSelect, getPartnerCandidates } from "@/lib/finance-actions";
import { queryCampaignsForSelect } from "@/lib/ad-campaign-actions";
import { DealNewPage } from "./deal-new-page";

export default async function NewDealPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect(`/${locale}`);
  const [employees, partnerCandidates, campaignOptions] = await Promise.all([
    queryEmployeesForSelect(),
    getPartnerCandidates(user.id),
    queryCampaignsForSelect(),
  ]);
  return <DealNewPage employees={employees} partners={partnerCandidates} currentUserId={user.id} campaignOptions={campaignOptions} />;
}
