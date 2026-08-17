import { redirect } from "next/navigation";
import { getLocale, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPartnerFinanceDetail } from "@/lib/finance-actions";
import { PartnerDetailPage } from "./partner-detail-page";

export default async function PartnerDetailServerPage({ params }: { params: Promise<{ locale: string; partnerId: string }> }) {
  const { locale, partnerId } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect(`/${locale}`);
  const data = await getPartnerFinanceDetail(partnerId);
  if (!data) redirect(`/${locale}/finances`);
  return <PartnerDetailPage data={data} />;
}
