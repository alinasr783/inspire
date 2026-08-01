import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { DashboardClientShell } from "@/components/providers/dashboard-client-shell";

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
  const { data: profile } = await admin
    .from("profiles")
    .select("approval_status, role, first_name, second_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.approval_status !== "approved") {
    redirect(`/${locale}/auth/pending`);
  }

  const shellUser = {
    id: user.id,
    firstName: profile.first_name,
    secondName: profile.second_name,
    email: user.email,
    role: profile.role,
  };

  let initialPending = 0;
  if (profile.role === "admin") {
    const { count } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("approval_status", "pending");
    initialPending = count ?? 0;
  }

  return (
    <DashboardClientShell user={shellUser} initialPending={initialPending}>
      <div className="flex min-h-screen">
        <Sidebar role={profile.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar role={profile.role} />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </DashboardClientShell>
  );
}
