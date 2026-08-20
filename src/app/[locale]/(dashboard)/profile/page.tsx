import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileForm } from "@/components/profile/profile-form";
import { getCrmLogoUrl } from "@/lib/crm-actions";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();

  let profile: {
    first_name: string | null;
    second_name: string | null;
    avatar_url: string | null;
    primary_color: string | null;
    notification_prefs: Record<string, boolean> | null;
    show_ad_tracking: boolean | null;
    role: string;
  } | null = null;

  try {
    const { data } = await admin
      .from("profiles")
      .select("first_name, second_name, avatar_url, primary_color, notification_prefs, show_ad_tracking, role")
      .eq("id", user.id)
      .single();
    profile = data;
  } catch {
    const { data } = await admin
      .from("profiles")
      .select("first_name, second_name, role")
      .eq("id", user.id)
      .single();
    profile = data
      ? { ...data, avatar_url: null, primary_color: null, notification_prefs: null, show_ad_tracking: null }
      : null;
  }

  if (!profile) redirect(`/${locale}/auth/login`);

  const logoUrl = await getCrmLogoUrl();

  return (
    <ProfileForm
      firstName={profile.first_name ?? ""}
      secondName={profile.second_name ?? ""}
      email={user.email ?? ""}
      avatarUrl={profile.avatar_url ?? null}
      primaryColor={profile.primary_color ?? null}
      notificationPrefs={profile.notification_prefs ?? {}}
      showAdTracking={profile.show_ad_tracking ?? false}
      role={profile.role}
      logoUrl={logoUrl}
    />
  );
}
