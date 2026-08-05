import { redirect } from "next/navigation";
import { getLocale, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFullDealDetail } from "@/lib/finance-actions";
import { DealDetailsPage } from "./deal-details-page";

export default async function DealDetailServerPage({
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

  const deal = await getFullDealDetail(id);
  if (!deal) redirect(`/${locale}/finances`);

  return <DealDetailsPage deal={deal} />;
}
