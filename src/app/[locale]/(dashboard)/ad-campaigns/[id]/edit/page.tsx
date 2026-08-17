import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdCampaignDetail } from "@/lib/ad-campaign-actions";
import { CampaignForm } from "@/components/ad-campaigns/campaign-form";

export default async function EditCampaignPage({
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
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect(`/${locale}`);
  }

  const detail = await getAdCampaignDetail(id);
  if (!detail) {
    redirect(`/${locale}/ad-campaigns`);
  }

  return <CampaignForm mode="edit" existing={detail.campaign} />;
}
