import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CalendarClient } from "@/components/calendar/calendar-client";
import { getEmployees, getMonthlyStats } from "@/lib/daily-work-log-actions";
import { queryDailyWorkLogs } from "@/lib/query-actions";
import type { DailyWorkLogWithEmployee } from "@/lib/daily-work-log-types";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Calendar");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const admin = createAdminClient();
  const { data: currentProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = currentProfile?.role === "admin";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [initialLogs, employees, stats] = await Promise.all([
    queryDailyWorkLogs(year, month),
    isAdmin ? getEmployees() : Promise.resolve([]),
    getMonthlyStats(year, month),
  ]);

  return (
    <div className="space-y-6">
      <CalendarClient
        locale={locale}
        isAdmin={isAdmin}
        userId={user.id}
        initialLogs={initialLogs as DailyWorkLogWithEmployee[]}
        employees={employees}
        initialStats={stats}
      />
    </div>
  );
}
