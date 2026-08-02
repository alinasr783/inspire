import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileForm } from "@/components/profile/profile-form";

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

  let profile: { first_name: string | null; second_name: string | null; avatar_url: string | null } | null = null;

  try {
    const { data } = await admin
      .from("profiles")
      .select("first_name, second_name, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  } catch {
    const { data } = await admin
      .from("profiles")
      .select("first_name, second_name")
      .eq("id", user.id)
      .single();
    profile = data ? { ...data, avatar_url: null } : null;
  }

  return (
    <ProfileForm
      firstName={profile?.first_name ?? ""}
      secondName={profile?.second_name ?? ""}
      email={user.email ?? ""}
      avatarUrl={profile?.avatar_url ?? null}
    />
  );
}
