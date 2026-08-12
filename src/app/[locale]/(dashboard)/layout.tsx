import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { DashboardClientShell } from "@/components/providers/dashboard-client-shell";
import { ThemeColorProvider } from "@/components/providers/theme-color-provider";
import { getCrmLogoUrl } from "@/lib/crm-actions";
import { getActiveBan } from "@/lib/ban-actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const admin = createAdminClient();

  let profile: {
    approval_status: string;
    role: string;
    first_name: string;
    second_name: string;
    avatar_url: string | null;
    primary_color: string | null;
  } | null = null;

  try {
    const { data } = await admin
      .from("profiles")
      .select("approval_status, role, first_name, second_name, avatar_url, primary_color")
      .eq("id", user.id)
      .single();
    profile = data;
  } catch {
    const { data } = await admin
      .from("profiles")
      .select("approval_status, role, first_name, second_name")
      .eq("id", user.id)
      .single();
    profile = data ? { ...data, avatar_url: null, primary_color: null } : null;
  }

  if (!profile || profile.approval_status !== "approved") {
    redirect(`/${locale}/auth/pending`);
  }

  const banInfo = await getActiveBan(user.id);
  if (banInfo.is_banned) {
    redirect(`/${locale}/auth/banned`);
  }

  const shellUser = {
    id: user.id,
    firstName: profile.first_name,
    secondName: profile.second_name,
    email: user.email,
    role: profile.role,
    avatarUrl: profile.avatar_url,
  };

  let initialPending = 0;
  if (profile.role === "admin") {
    const { count } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("approval_status", "pending");
    initialPending = count ?? 0;
  }

  const logoUrl = await getCrmLogoUrl();

  return (
    <DashboardClientShell user={shellUser} initialPending={initialPending}>
      <ThemeColorProvider initialColor={profile.primary_color}>
        <div className="h-screen overflow-hidden">
          <Sidebar role={profile.role} logoUrl={logoUrl} />
          <div className="flex h-full min-w-0 flex-col md:ps-[232px]">
            <Topbar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>{children}</main>
          </div>
        </div>
        <BottomTabBar role={profile.role} />
      </ThemeColorProvider>
    </DashboardClientShell>
  );
}
